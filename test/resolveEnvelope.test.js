import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadTemplateFile } from '../src/loadRegistry.js';
import { normalizeFormData } from '../src/normalizers.js';
import { resolveEnvelope } from '../src/resolveEnvelope.js';

function findPowerCurveRadios(envelope) {
  const roles = envelope.templateRoles ?? [];
  for (const role of roles) {
    const groups = role.tabs?.radioGroupTabs ?? [];
    for (const group of groups) {
      if (String(group.groupName ?? '').includes('powerCurveStart')) {
        return group.radios ?? [];
      }
    }
  }
  return [];
}

function findIsTeamRadios(envelope) {
  const roles = envelope.templateRoles ?? [];
  for (const role of roles) {
    const groups = role.tabs?.radioGroupTabs ?? [];
    for (const group of groups) {
      if (String(group.groupName ?? '').includes('isTeam')) {
        return group.radios ?? [];
      }
    }
  }
  return [];
}

describe('resolveEnvelope', () => {
  const envelope = loadTemplateFile('standard_nhpw_seasoned_agent_will_have_loi.json');

  const baseFormData = normalizeFormData({
    zendesk_office_id: '23308433036311',
    agentType: 'Seasoned',
    loi: 'Yes',
    isTeam: true,
    powerCurveStart: 'Feb',
    trainingType: 'Traditional',
    resideInCal: 'yes',
    legalName: 'Jane Agent',
    languages: ['Spanish', 'French'],
    firstName: 'Jane',
    lastName: 'Agent',
    email: 'jane@example.com',
    cellPhone: '555-0100',
  });

  const item = {
    formData: baseFormData,
    requestData: {
      agent_name: 'Jane Agent',
      agent_email: 'jane@example.com',
      office_manager_name: 'Manager',
      office_manager_email: 'mgr@example.com',
    },
  };

  it('removes all {{ }} placeholders', () => {
    const resolved = resolveEnvelope(envelope, item);
    assert.equal(JSON.stringify(resolved).includes('{{'), false);
  });

  it('resolves powerCurveStart month radio selected flags', () => {
    const resolved = resolveEnvelope(envelope, item);
    const radios = findPowerCurveRadios(resolved);
    assert.ok(radios.length > 0);
    const feb = radios.find((r) => r.value === 'Feb');
    const mar = radios.find((r) => r.value === 'Mar');
    assert.equal(feb?.selected, 'true');
    assert.equal(mar?.selected, 'false');
  });

  it('normalizes isTeam boolean to Yes radio selected', () => {
    const resolved = resolveEnvelope(envelope, item);
    const radios = findIsTeamRadios(resolved);
    assert.ok(radios.length >= 2);
    const yes = radios.find((r) => r.value === 'Yes' || String(r.value).toLowerCase() === 'yes');
    const no = radios.find((r) => r.value === 'No' || String(r.value).toLowerCase() === 'no');
    if (yes && no) {
      assert.equal(yes.selected, 'true');
      assert.equal(no.selected, 'false');
    }
  });

  it('resolves languages.join in text tabs', () => {
    const resolved = resolveEnvelope(envelope, item);
    const roles = resolved.templateRoles ?? [];
    let found = false;
    for (const role of roles) {
      for (const tab of role.tabs?.textTabs ?? []) {
        if (tab.value === 'Spanish, French') {
          found = true;
        }
      }
    }
    assert.equal(found, true);
  });

  it('resolves requestData agent name on role', () => {
    const resolved = resolveEnvelope(envelope, item);
    const agent = (resolved.templateRoles ?? []).find((r) => r.roleName === 'Agent');
    assert.equal(agent?.name, 'Jane Agent');
    assert.equal(agent?.email, 'jane@example.com');
  });
});
