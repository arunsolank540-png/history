// THE KING WHO TRIED TO PROVE COFFEE WAS POISON: the shot list (Tall Tale 3D).
import * as THREE from 'three';
import { ctx, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import * as WD from './core/world.js';
import * as PR from './core/props.js';
import { Toon, PROPS } from './core/toon.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mix = (a, b, k) => a.clone().lerp(b, k);
const talk = (t, on = 1) => (on ? 0.25 + 0.75 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 5.3)) : 0);
const blink = (t, off = 0) => (((t + off) % 3.3) < 0.12 ? 1 : 0);

const LOOK = {
  king: { body: '#8A2E3F', hat: 'crown', hatCol: '#F2C230', neck: 'bowtie', neckCol: '#E2B33C', pattern: 'vest', patCol: '#5C1D2A', extra: ['mustache'] },
  guard: { body: '#2E4E8A', hat: 'visor', hatCol: '#1E3560', neck: 'collar', pattern: 'stripes', patCol: '#1E3560', extra: ['mustache'] },
  twinCoffee: { body: '#7A4E3A', pattern: 'stripes', patCol: '#4A2E1A', extra: [] },
  twinTea: { body: '#4E7A5A', pattern: 'stripes', patCol: '#2E4E3A', extra: [] },
  docA: { body: '#4A4560', hat: 'bowler', hatCol: '#2A2638', neck: 'bowtie', neckCol: '#D8343F', extra: ['glasses', 'mustache'] },
  docB: { body: '#3A354A', hat: 'tophat', hatCol: '#221F2C', neck: 'collar', extra: ['monocle', 'mustache'] },
  citizen: { body: '#C87A4A', hat: 'cap', hatCol: '#7A4A28', neck: 'scarf', neckCol: '#B5372E', pattern: 'apron', patCol: '#E8D4B0' },
};
const person = (k, opts) => new Toon({ ...LOOK[k], extra: [...(LOOK[k].extra || [])] }, opts);

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.06);
  const cam = camera(36);
  const LOOKS = {
    street: { bloom: 0.15, aperture: 0.0012, maxblur: 0.008 },
    room: { bloom: 0.3, aperture: 0.001, maxblur: 0.008 },
    field: { bloom: 0.25, aperture: 0.001, maxblur: 0.007 }
  };
  const shoot = (scene, people, from, to, at, at2, k, look, focus) => {
    if (cam.fov !== (look.fov || 36)) { cam.fov = look.fov || 36; cam.updateProjectionMatrix(); }
    cam.position.copy(mix(from, to, k)); cam.lookAt(at2 ? mix(at, at2, k) : at);
    people.forEach((p) => p.face(cam));
    E.render(scene, cam, { ...look, focus: focus ?? cam.position.distanceTo(at2 ? mix(at, at2, k) : at) });
  };

  // ── 1. The Street ────────────────────────────────────────────────────────
  const SHOP_ORDER = [
    ['ROYAL CAFE', '#C9603F', 'brick', '#D8343F'], ['BAKERY', '#6FA3B8', 'wood', null],
    ['TAVERN', '#E3C16F', 'wood', '#3C6FB6'], ['APOTHECARY', '#9E4A3A', 'brick', null],
    ['PALACE GATES', '#7FA36A', 'brick', '#2E4E8A'], ['COURT', '#B5553C', 'brick', '#F2C230']
  ];
  const ST = WD.mainStreet(E, { shops: SHOP_ORDER });
  ST.sun.key.target.position.set(-4, 0, 0); ST.sun.key.position.set(5, 13, 6);
  const stGuard = person('guard'), stCit = person('citizen');
  [stGuard, stCit].forEach((p) => ST.scene.add(p.group));

  // ── 2. The Royal Palace Office ──────────────────────────────────────────
  const OF = WD.interior(E, {
    w: 7, depth: 6, wall: '#8A2E3F', motif: '#9E3C4F', ceiling: '#2A2638', floor: '#5A3E2A',
    signText: 'ROYAL DECREE', counterOn: false, litter: false
  });
  const dk = PR.desk(2.4); dk.position.set(0.4, 0, -3.2); OF.scene.add(dk);
  const ofKing = person('king'), ofGuard = person('guard');
  ofKing.at(0.4, 0, -3.95); ofGuard.at(2.5, 0, -3.2);
  [ofKing, ofGuard].forEach((p) => OF.scene.add(p.group));

  // ── 3. The Royal Council Room / Cell ─────────────────────────────────────
  const IN = WD.interior(E, {
    wall: '#2E3A3F', motif: '#3B4D54', ceiling: '#1F2A2E',
    signText: 'PRISON CELL', counterOn: true, litter: false
  });
  const inTwinC = person('twinCoffee'), inTwinT = person('twinTea');
  const inDocA = person('docA'), inDocB = person('docB');
  [inTwinC, inTwinT, inDocA, inDocB].forEach((p) => IN.scene.add(p.group));

  // ── 4. The Countryside Meadow ────────────────────────────────────────────
  const MD = WD.meadow(E, { fenceOn: true });
  MD.sun.key.position.set(9, 14, 8); MD.sun.key.target.position.set(5, 0, -6);
  const home = PR.house({ wall: '#F2E6CF', roof: '#B5553C', door: '#3C6FB6' });
  home.position.set(0, 0, -6); MD.scene.add(home);
  const mdTwinC = person('twinCoffee'), mdTwinT = person('twinTea');
  [mdTwinC, mdTwinT].forEach((p) => MD.scene.add(p.group));

  // ── S01 · HOOK: "In seventeen forty-six, the King of Sweden decided coffee was a deadly poison," ──
  {
    const st = cut(0), wp = Wd('poison,', 0);
    add({
      id: 'S01', at: st, note: 'King glares at steaming coffee cup in royal office',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        ofKing.set({ mood: t > wp ? 'angry' : 'smug', armR: [40, -80], holdR: PROPS.cup, look: [0.3, 0.4], blink: blink(t) });
        ofGuard.set({ mood: 'neutral', armL: [20, 0], blink: blink(t, 1) });
        shoot(OF.scene, [ofKing, ofGuard], V3(-0.8, 2.2, -0.6), V3(0.0, 1.9, -1.8), V3(0.4, 1.4, -3.8), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st + 0.1, 'whoosh', { gain: 0.6 }); cue(wp, 'ding', { gain: 0.7 });
  }

  // ── S02 · "so he banned every single cup in the country." ──
  {
    const st = cut(1), wb = Wd('banned', 1);
    add({
      id: 'S02', at: st, note: 'Royal guard posts ban notice on street wall',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        stGuard.at(-4.5, 0.18, -3.0); stGuard.set({ mood: 'proud', armR: [70, -20], holdR: PROPS.paper('BANNED'), blink: blink(t) });
        stCit.at(-3.0, 0.18, -2.8); stCit.set({ mood: 'shock', armL: [30, -30], armR: [40, -40], sweat: 1 });
        shoot(ST.scene, [stGuard, stCit], V3(-1.0, 2.2, -6.0), V3(-2.2, 1.8, -4.8), V3(-4.0, 1.4, -3.0), null, k, LOOKS.street);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wb, 'stamp', { gain: 0.8 });
  }

  // ── S03 · "When citizens kept brewing it in secret," ──
  {
    const st = cut(2), ws = Wd('secret,', 2);
    add({
      id: 'S03', at: st, note: 'Citizen covertly sips coffee in street alley',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        stGuard.at(-6.0, 0.18, -6.0); stGuard.set({ mood: 'neutral' });
        stCit.at(-3.6, 0.18, -1.8); stCit.set({ mood: 'sly', armR: [50, -80], holdR: PROPS.cup, look: [0.6, -0.2], blink: blink(t) });
        shoot(ST.scene, [stCit, stGuard], V3(-1.8, 1.7, 1.2), V3(-2.4, 1.6, 0.2), V3(-3.6, 1.3, -1.8), null, k, LOOKS.street);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(ws, 'pop', { gain: 0.6 });
  }

  // ── S04 · "he launched the weirdest royal experiment in history." ──
  {
    const st = cut(3), we = Wd('experiment', 3);
    add({
      id: 'S04', at: st, note: 'King unveils plan with big book/scroll',
      draw(lt, d, t, blit) {
        const k = eo(clamp(lt / d));
        ofKing.set({ mood: 'proud', armL: [30, -70], armR: [30, -70], holdR: PROPS.book('PLAN', 1), talk: talk(t), blink: blink(t) });
        shoot(OF.scene, [ofKing], V3(-0.2, 2.1, -1.2), V3(0.2, 1.9, -2.0), V3(0.4, 1.4, -3.8), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(we, 'ding', { gain: 0.7 });
  }

  // ── S05 · "He found two identical twin prisoners on death row," ──
  {
    const st = cut(4), wt = Wd('twin', 4);
    add({
      id: 'S05', at: st, note: 'Two identical twin prisoners looking nervous',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        inTwinC.at(1.8, 0, -2.5); inTwinT.at(2.8, 0, -2.5);
        inTwinC.set({ mood: 'worried', armL: [20, 10], armR: [20, 10], sweat: 1, blink: blink(t) });
        inTwinT.set({ mood: 'worried', armL: [20, 10], armR: [20, 10], sweat: 1, blink: blink(t, 0.5) });
        inDocA.group.visible = inDocB.group.visible = false;
        shoot(IN.scene, [inTwinC, inTwinT], V3(2.3, 2.2, 1.5), V3(2.3, 1.8, 0.5), V3(2.3, 1.3, -2.5), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wt, 'boing', { gain: 0.6 });
  }

  // ── S06 · "and offered them a strange royal pardon:" ──
  {
    const st = cut(5), wp = Wd('pardon:', 5);
    add({
      id: 'S06', at: st, note: 'King holds up wax-sealed pardon scroll',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        ofKing.set({ mood: 'smug', armR: [60, -50], holdR: PROPS.paper('PARDON'), talk: talk(t), blink: blink(t) });
        shoot(OF.scene, [ofKing], V3(-0.6, 2.0, -1.8), V3(0.0, 1.8, -2.2), V3(0.4, 1.4, -3.9), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wp, 'ding', { gain: 0.8 });
  }

  // ── S07 · "their sentences were commuted," ──
  {
    const st = cut(6);
    add({
      id: 'S07', at: st, note: 'Twins relieved and smiling',
      draw(lt, d, t, blit) {
        const k = eo(clamp(lt / d));
        inTwinC.at(1.8, 0, -2.5); inTwinT.at(2.8, 0, -2.5);
        inTwinC.set({ mood: 'happy', armL: [40, 30], armR: [40, 30], blink: blink(t) });
        inTwinT.set({ mood: 'happy', armL: [40, 30], armR: [40, 30], blink: blink(t, 0.8) });
        shoot(IN.scene, [inTwinC, inTwinT], V3(2.3, 1.8, 0.8), V3(2.3, 1.6, -0.2), V3(2.3, 1.25, -2.5), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh', { gain: 0.5 });
  }

  // ── S08 · "as long as one drank three pots of coffee every day," ──
  {
    const st = cut(7), wc = Wd('coffee', 7);
    add({
      id: 'S08', at: st, note: 'Coffee twin happily chugs coffee',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        inTwinC.at(2.3, 0, -2.2); inTwinT.group.visible = false;
        inTwinC.set({ mood: 'happy', armR: [50, -80], holdR: PROPS.cup, blink: blink(t) });
        shoot(IN.scene, [inTwinC], V3(2.3, 1.8, 0.5), V3(2.3, 1.6, -0.6), V3(2.3, 1.25, -2.2), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wc, 'pop', { gain: 0.7 });
  }

  // ── S09 · "while his brother drank three pots of tea." ──
  {
    const st = cut(8), wt = Wd('tea.', 8);
    add({
      id: 'S09', at: st, note: 'Tea twin calmly sips tea',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        inTwinT.group.visible = true; inTwinT.at(2.3, 0, -2.2); inTwinC.group.visible = false;
        inTwinT.set({ mood: 'smug', armL: [50, -80], holdL: PROPS.cup, blink: blink(t) });
        shoot(IN.scene, [inTwinT], V3(2.3, 1.8, 0.5), V3(2.3, 1.6, -0.6), V3(2.3, 1.25, -2.2), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wt, 'ding', { gain: 0.6 });
  }

  // ── S10 · "Two royal doctors were ordered to watch them closely," ──
  {
    const st = cut(9), wd = Wd('closely,', 9);
    add({
      id: 'S10', at: st, note: 'Two royal doctors inspect closely with books and glasses',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        inTwinC.group.visible = inTwinT.group.visible = false;
        inDocA.group.visible = inDocB.group.visible = true;
        inDocA.at(1.8, 0, -2.3); inDocB.at(2.8, 0, -2.3);
        inDocA.set({ mood: 'smug', armR: [30, -70], holdR: PROPS.book('RX', 0), blink: blink(t) });
        inDocB.set({ mood: 'sly', armL: [40, -40], look: [-0.6, 0.2], blink: blink(t, 0.7) });
        shoot(IN.scene, [inDocA, inDocB], V3(2.3, 2.0, 1.0), V3(2.3, 1.7, 0.0), V3(2.3, 1.3, -2.3), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wd, 'plop', { gain: 0.7 });
  }

  // ── S11 · "waiting for the coffee drinker to drop dead." ──
  {
    const st = cut(10), wd = Wd('dead.', 10);
    add({
      id: 'S11', at: st, note: 'Doctors waiting, tapping feet and watching',
      draw(lt, d, t, blit) {
        const k = eo(clamp(lt / d));
        inDocA.set({ mood: 'worried', armL: [20, 10], armR: [20, 10], sweat: 1, blink: blink(t) });
        inDocB.set({ mood: 'worried', armL: [20, 10], armR: [20, 10], sweat: 1, blink: blink(t, 1.1) });
        shoot(IN.scene, [inDocA, inDocB], V3(2.3, 1.7, 0.2), V3(2.3, 1.6, -0.6), V3(2.3, 1.3, -2.3), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wd, 'boing', { gain: 0.6 });
  }

  // ── S12 · "Except... both doctors died of old age first." ──
  {
    const st = cut(11), wf = Wd('first.', 11);
    add({
      id: 'S12', at: st, note: 'Camera dollies past countryside cemetery/meadow',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdTwinC.group.visible = mdTwinT.group.visible = false;
        shoot(MD.scene, [], V3(3.4, 2.3, 5.2), V3(4.2, 4.6, 3.0), V3(6.2, 2.4, 2.4), V3(20, 2, -30), k, LOOKS.field);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wf, 'ding', { gain: 0.7 });
  }

  // ── S13 · "Then the King himself was assassinated." ──
  {
    const st = cut(12), wa = Wd('assassinated.', 12);
    add({
      id: 'S13', at: st, note: 'Royal palace empty throne room, crown resting alone',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        ofKing.group.visible = false; ofGuard.group.visible = false;
        shoot(OF.scene, [], V3(-0.4, 2.2, -0.5), V3(0.0, 1.8, -1.8), V3(0.4, 1.2, -3.8), null, k, LOOKS.room);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wa, 'boing', { gain: 0.8 });
  }

  // ── S14 · "Decades later, the tea drinker passed away at eighty-three," ──
  {
    const st = cut(13), we = Wd('eighty-three,', 13);
    add({
      id: 'S14', at: st, note: 'House in meadow: empty porch',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdTwinT.group.visible = false;
        shoot(MD.scene, [], V3(-1.0, 1.7, 4.6), V3(-0.3, 1.5, 3.0), V3(0, 1.3, -4), null, k, LOOKS.field);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(we, 'pop', { gain: 0.5 });
  }

  // ── S15 · "leaving the coffee drinker alive, happily sipping his daily brew." ──
  {
    const st = cut(14), wb = Wd('brew.', 14);
    add({
      id: 'S15', at: st, note: 'Coffee twin stands triumphant on porch, sipping coffee and smiling',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdTwinC.group.visible = true; mdTwinT.group.visible = false;
        mdTwinC.at(0.0, 0.12, -3.8);
        mdTwinC.set({ mood: 'smug', armR: [50, -80], holdR: PROPS.cup, look: [0.2, 0.0], blink: blink(t) });
        shoot(MD.scene, [mdTwinC], V3(0.0, 1.8, 1.0), V3(0.0, 1.6, -0.8), V3(0.0, 1.35, -3.8), null, k, LOOKS.field);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wb, 'ding', { gain: 0.9 });
  }

  return { shots: S, cues: CUES };
}
