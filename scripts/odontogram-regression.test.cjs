const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/apps/equichart/vt-odonto-steps.jsx'), 'utf8');

test('the seven supplied icons map to existing files and the correct tool IDs', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(section('const GX_REFERENCE_ICONS =', 'function GxToolIcon(') + '; icons = GX_REFERENCE_ICONS;', context);
  const expected = { 'mk-atr': 'atr-etr', 'mk-protub': 'protuberancia', 'mk-incis': 'incisivos', 'mk-hook': 'gancho', 'st-diastema': 'diastema', 'st-wolf': 'dente-lobo', 'st-tartar': 'tartaro' };
  assert.equal(Object.keys(context.icons).length, 7);
  for (const [id, asset] of Object.entries(expected)) {
    assert.equal(context.icons[id][0], asset);
    assert.ok(fs.statSync(path.join(__dirname, '../assets/toolbar-reference', asset + '.jpeg')).size > 0);
  }
});

function section(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}

test('hit test reaches the actual tooth under the drawing canvas and restores pointer events', () => {
  const canvas = { style: { pointerEvents: 'auto' }, parentElement: { contains: () => true } };
  const zone = { getAttribute: () => '108' };
  const target = { closest: () => zone, getBoundingClientRect: () => ({ left: 10, top: 20, width: 40, height: 30 }) };
  const context = { canvasRef: { current: canvas }, document: { elementsFromPoint() {
    assert.equal(canvas.style.pointerEvents, 'none');
    return [target];
  } } };
  vm.createContext(context);
  vm.runInContext(section('const toothAtPoint =', 'const restoreToothFill =') + '; result = toothAtPoint(20, 30)', context);
  assert.equal(context.result.toothId, '108');
  assert.equal(context.result.cx, 30);
  assert.equal(context.result.cy, 35);
  assert.equal(canvas.style.pointerEvents, 'auto');
});

test('empty space does not select the nearest tooth', () => {
  const canvas = { style: { pointerEvents: 'auto' } };
  const context = { canvasRef: { current: canvas }, document: { elementsFromPoint: () => [] } };
  vm.createContext(context);
  vm.runInContext(section('const toothAtPoint =', 'const restoreToothFill =') + '; result = toothAtPoint(20, 30)', context);
  assert.equal(context.result, null);
  assert.equal(canvas.style.pointerEvents, 'auto');
});

test('failed hit test still restores canvas interaction', () => {
  const canvas = { style: { pointerEvents: 'auto' } };
  const context = { canvasRef: { current: canvas }, document: { elementsFromPoint() { throw Error('test'); } } };
  vm.createContext(context);
  vm.runInContext(section('const toothAtPoint =', 'const restoreToothFill =') + '; result = toothAtPoint(20, 30)', context);
  assert.equal(context.result, null);
  assert.equal(canvas.style.pointerEvents, 'auto');
});

test('saved history keeps editable fills, marks and drawing, preserving other patients', () => {
  let data = { odontoGraficos: { Other: { current: 'previous', list: [] } } };
  const context = { window: { VtStore: { getData: () => data, setData: patch => { data = { ...data, ...patch }; } } } };
  vm.createContext(context);
  vm.runInContext(section('function gxSaveStore(', 'function OdGraficoStep('), context);
  const chart = { toothFills: { 108: '#ef4444' }, gmarks: [{ id: 'one' }], drawing: 'data:image/png;base64,test' };
  context.gxSaveStore('Test', 'preview', chart);
  assert.equal(data.odontoGraficos.Other.current, 'previous');
  assert.deepEqual(data.odontoGraficos.Test.currentData, chart);
  assert.deepEqual(data.odontoGraficos.Test.list[0].data, chart);
});
