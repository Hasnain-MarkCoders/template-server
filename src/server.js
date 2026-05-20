import express from 'express';
import {
  loadRegistry,
  loadTemplateFile,
  setRegistryCache,
} from './loadRegistry.js';
import { findRule } from './matchTemplate.js';
import { validateRegistryOnDisk } from './validateRegistry.js';

const PORT = Number(process.env.PORT) || 3100;

const registry = validateRegistryOnDisk();
setRegistryCache(registry);

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: registry.version });
});

app.get('/registry', (_req, res) => {
  res.json(registry);
});

app.post('/match', (req, res) => {
  try {
    const formData = req.body?.formData ?? req.body ?? {};
    const { rule, ctx } = findRule(registry, formData);
    const meta = registry.payloads[rule.payloadKey];

    if (!meta?.file) {
      return res.status(500).json({
        matched: false,
        error: `Missing payload file for ${rule.payloadKey}`,
      });
    }

    const envelope = loadTemplateFile(meta.file);

    console.log(
      JSON.stringify({
        event: 'template_match',
        ruleId: rule.id,
        payloadKey: rule.payloadKey,
        templateId: meta.templateId,
        ctx,
      })
    );

    res.json({
      matched: true,
      ruleId: rule.id,
      payloadKey: rule.payloadKey,
      templateId: meta.templateId,
      docusignName: meta.docusignName,
      match: rule.match,
      ctx,
      envelope,
    });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({
      matched: false,
      error: e.message,
      ctx: e.ctx,
      ruleIds: e.ruleIds,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Template server listening on http://localhost:${PORT}`);
  console.log(`Rules loaded: ${registry.rules.length}`);
});
