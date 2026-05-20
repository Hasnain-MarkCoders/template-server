import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { readRegistryFromDisk } from '../src/loadRegistry.js';
import { findRule, matchRule } from '../src/matchTemplate.js';
import { getValue } from '../src/normalizers.js';
import { validateRegistry, canonicalizeMatch } from '../src/validateRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANAHEIM_ID = '23308433036311';

describe('normalizers', () => {
  it('normalizes loi boolean and case', () => {
    assert.equal(getValue({ loi: true }, 'loi'), 'Yes');
    assert.equal(getValue({ loi: 'no' }, 'loi'), 'No');
    assert.equal(getValue({ loi: 'YES' }, 'loi'), 'Yes');
  });

  it('normalizes agentType case', () => {
    assert.equal(getValue({ agentType: 'new' }, 'agentType'), 'New');
    assert.equal(getValue({ agentType: 'SEASONED' }, 'agentType'), 'Seasoned');
  });
});

describe('findRule', () => {
  const registry = readRegistryFromDisk();

  it('matches Anaheim New + No LOI', () => {
    const { rule } = findRule(registry, {
      zendesk_office_id: ANAHEIM_ID,
      agentType: 'New',
      loi: 'No',
    });
    assert.equal(rule.id, 'standard-new-anaheim');
    assert.equal(rule.payloadKey, 'standard_nhpw_new_agent_no_loi');
  });

  it('matches Anaheim Seasoned + Yes LOI', () => {
    const { rule } = findRule(registry, {
      zendesk_office_id: ANAHEIM_ID,
      agentType: 'Seasoned',
      loi: 'Yes',
    });
    assert.equal(rule.id, 'standard-seasoned-anaheim');
    assert.equal(rule.payloadKey, 'standard_nhpw_seasoned_agent_will_have_loi');
  });

  it('returns 409 when multiple rules match', () => {
    const ambiguousRegistry = {
      allowedMatchFields: ['zendesk_office_id', 'agentType', 'loi'],
      rules: [
        {
          id: 'rule-a',
          priority: 10,
          payloadKey: 'a',
          match: { zendesk_office_id: ANAHEIM_ID, agentType: 'New', loi: 'No' },
        },
        {
          id: 'rule-b',
          priority: 10,
          payloadKey: 'b',
          match: { zendesk_office_id: ANAHEIM_ID, agentType: 'New', loi: 'No' },
        },
      ],
    };
    assert.throws(
      () =>
        findRule(ambiguousRegistry, {
          zendesk_office_id: ANAHEIM_ID,
          agentType: 'New',
          loi: 'No',
        }),
      (e) => e.statusCode === 409 && e.ruleIds?.length === 2
    );
  });

  it('returns 404 for unknown office', () => {
    assert.throws(
      () =>
        findRule(registry, {
          zendesk_office_id: '99999999999',
          agentType: 'New',
          loi: 'No',
        }),
      (e) => e.statusCode === 404
    );
  });

  it('matches zendesk_office_id in rule array', () => {
    const allowed = registry.allowedMatchFields;
    const match = {
      zendesk_office_id: [ANAHEIM_ID, 'other-id'],
      agentType: 'New',
      loi: 'No',
    };
    assert.equal(
      matchRule(match, { zendesk_office_id: ANAHEIM_ID, agentType: 'New', loi: 'No' }, allowed),
      true
    );
    assert.equal(
      matchRule(match, { zendesk_office_id: 'other-id', agentType: 'New', loi: 'No' }, allowed),
      true
    );
  });
});

describe('validateRegistry', () => {
  it('rejects duplicate match signatures', () => {
    const registry = readRegistryFromDisk();
    const bad = {
      ...registry,
      rules: [
        ...registry.rules,
        {
          id: 'duplicate-test',
          priority: 5,
          payloadKey: 'standard_nhpw_new_agent_no_loi',
          match: registry.rules[0].match,
        },
      ],
    };
    assert.throws(() => validateRegistry(bad, { checkFiles: false }), /Duplicate match signature/);
  });

  it('rejects empty match', () => {
    const registry = readRegistryFromDisk();
    const bad = {
      ...registry,
      rules: [
        {
          id: 'empty-match',
          priority: 1,
          payloadKey: 'standard_nhpw_new_agent_no_loi',
          match: {},
        },
      ],
    };
    assert.throws(() => validateRegistry(bad, { checkFiles: false }), /match must not be empty/);
  });

  it('canonicalizeMatch is stable', () => {
    const a = canonicalizeMatch({
      loi: 'No',
      agentType: 'New',
      zendesk_office_id: ['23308433036311'],
    });
    const b = canonicalizeMatch({
      zendesk_office_id: ['23308433036311'],
      agentType: 'New',
      loi: 'No',
    });
    assert.equal(a, b);
  });
});
