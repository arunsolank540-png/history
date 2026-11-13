// THE SHAPE THAT SAVED ROLLER COASTER LOOPS: the shot list (Tall Tale 3D).
import * as THREE from 'three';
import { ctx, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import * as WD from './core/world.js';
import * as PR from './core/props.js';
import { Toon, PROPS, INK } from './core/toon.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mix = (a, b, k) => a.clone().lerp(b, k);
const talk = (t, on = 1) => (on ? 0.25 + 0.75 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 5.3)) : 0);
const blink = (t, off = 0) => (((t + off) % 3.3) < 0.12 ? 1 : 0);

// Characters for the Coney Island 1895 story
const LOOK = {
  builder: { body: '#E8A038', pattern: 'overalls', patCol: '#2E5088', hat: 'cap', hatCol: '#D8343F', extra: ['mustache'] },
  rival: { body: '#3A3845', hat: 'tophat', hatCol: '#1E1D24', neck: 'bowtie', neckCol: '#C93838', pattern: 'vest', patCol: '#1E1D24', extra: ['mustache', 'monocle'] },
  dummy: { body: '#C8935A', pattern: 'stripes', patCol: '#9A6A35', neck: 'bowtie', neckCol: '#D8343F', extra: ['freckles'] },
  rider: { body: '#4EA5D9', hat: 'cap', hatCol: '#F2C230', neck: 'scarf', neckCol: '#D8343F' },
  medic: { body: '#F4EFE4', pattern: 'vest', patCol: '#D8343F', hat: 'visor', hatCol: '#FFFFFF', extra: ['glasses', 'mustache'] },
  crowd: { body: '#6FA3B8', hat: 'boater', hatCol: '#E8C77A' }
};
const person = (k, opts) => new Toon({ ...LOOK[k], extra: [...(LOOK[k].extra || [])] }, opts);

// Helper: build a coaster cart
function createCart(color = '#D8343F') {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#222226', roughness: 0.7 });
  const metalMat = new THREE.MeshStandardMaterial({ color: '#E0D8C8', metalness: 0.8, roughness: 0.2 });

  // cart chassis / tub
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 1.4), bodyMat);
  b.position.set(0, 0.35, 0); b.castShadow = true; g.add(b);

  // seat back
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.12), darkMat);
  seat.position.set(0, 0.65, -0.45); g.add(seat);

  // lap safety bar
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8), metalMat);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.62, 0.1); g.add(bar);

  // 4 steel flanged wheels
  [[-0.54, 0.45], [0.54, 0.45], [-0.54, -0.45], [0.54, -0.45]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), darkMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.18, z); g.add(w);
  });

  return g;
}

// Helper: build a coaster loop (circle or clothoid teardrop)
function createLoop(type = 'circle', railCol = '#D8343F') {
  const g = new THREE.Group();
  const railMat = new THREE.MeshStandardMaterial({ color: railCol, metalness: 0.6, roughness: 0.3 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#7A5236', roughness: 0.9 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#5A3825', roughness: 0.85 });

  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    let r, x, y;
    if (type === 'circle') {
      r = 2.4;
      x = r * Math.sin(a);
      y = 2.5 - r * Math.cos(a);
    } else {
      // Clothoid teardrop: wider bottom (large radius), sharper apex (small radius)
      r = 2.2 * (1.3 - 0.5 * Math.sin(a / 2));
      x = r * Math.sin(a);
      y = 2.5 - r * Math.cos(a) + 0.36;
    }
    pts.push(new THREE.Vector3(x, y, 0));
  }

  const curve = new THREE.CatmullRomCurve3(pts, true);

  // Two parallel tubular rails
  [-0.22, 0.22].forEach((zOff) => {
    const railPts = pts.map(p => new THREE.Vector3(p.x, p.y, zOff));
    const railCurve = new THREE.CatmullRomCurve3(railPts, true);
    const railGeom = new THREE.TubeGeometry(railCurve, 40, 0.05, 8, true);
    const railMesh = new THREE.Mesh(railGeom, railMat);
    railMesh.castShadow = true; g.add(railMesh);
  });

  // Cross-ties connecting the two rails
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.58), woodMat);
    tie.position.copy(p);
    tie.castShadow = true;
    g.add(tie);
  }

  // Trestle scaffolding legs holding up the loop
  [-2.0, -0.9, 0.9, 2.0].forEach((xLeg) => {
    const legH = (type === 'circle' ? 4.2 : 4.8);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, legH, 8), frameMat);
    leg.position.set(xLeg, legH / 2, -0.3);
    leg.castShadow = true; g.add(leg);
    const legB = leg.clone();
    legB.position.z = 0.3; g.add(legB);
  });

  g.curve = curve;
  return g;
}

// 2D Overlay helper for bold stylized text
function drawCaptionTag(c, text, x, y, col = '#F2C230', bg = 'rgba(25, 23, 40, 0.88)') {
  c.save();
  c.font = '900 38px Inter, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const m = c.measureText(text);
  const pw = m.width + 48, ph = 64;
  c.fillStyle = bg;
  c.beginPath(); c.roundRect(x - pw / 2, y - ph / 2, pw, ph, 14); c.fill();
  c.strokeStyle = col; c.lineWidth = 4; c.stroke();
  c.fillStyle = col; c.fillText(text, x, y);
  c.restore();
}

// 2D G-Force warning meter overlay
function drawGauge(c, gVal, x = 540, y = 320) {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(20, 15, 25, 0.92)';
  c.beginPath(); c.roundRect(-220, -90, 440, 180, 20); c.fill();
  c.strokeStyle = gVal > 8 ? '#E53E3E' : '#48BB78'; c.lineWidth = 6; c.stroke();

  c.font = '900 28px Inter'; c.fillStyle = '#E2E8F0'; c.textAlign = 'center';
  c.fillText('CENTRIPETAL FORCE', 0, -45);

  c.font = '900 72px Inter'; c.fillStyle = gVal > 8 ? '#FF4545' : '#48BB78';
  c.fillText(`${gVal.toFixed(1)} Gs`, 0, 24);

  if (gVal > 8) {
    c.font = '900 24px Inter'; c.fillStyle = '#FED7D7';
    c.fillText('⚠️ SEVERE TRAUMA DANGER', 0, 62);
  }
  c.restore();
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.06);
  const cam = camera(36);
  const LOOKS = {
    street: { bloom: 0.18, aperture: 0.0012, maxblur: 0.008 },
    room: { bloom: 0.28, aperture: 0.001, maxblur: 0.008 },
    field: { bloom: 0.22, aperture: 0.001, maxblur: 0.007 }
  };
  const shoot = (scene, people, from, to, at, at2, k, look, focus) => {
    if (cam.fov !== (look.fov || 36)) { cam.fov = look.fov || 36; cam.updateProjectionMatrix(); }
    cam.position.copy(mix(from, to, k)); cam.lookAt(at2 ? mix(at, at2, k) : at);
    people.forEach((p) => p.face(cam));
    E.render(scene, cam, { ...look, focus: focus ?? cam.position.distanceTo(at2 ? mix(at, at2, k) : at) });
  };

  // ── Set 1: Coney Island Boardwalk Street (ST) ───────────────────────────
  const SHOPS = [
    ['FLIP FLAP', '#C9603F', 'brick', '#D8343F'],
    ['TICKETS', '#E3C16F', 'wood', '#3C6FB6'],
    ['AMBULANCE', '#F4EFE4', 'wood', '#D8343F'],
    ['ARCADE', '#9E4A3A', 'brick', '#F2C230'],
    ['BOARDWALK', '#6FA3B8', 'wood', null],
    ['SOUVENIRS', '#E58A6A', 'wood', '#2E4E3F']
  ];
  const ST = WD.mainStreet(E, { shops: SHOPS });
  ST.sun.key.target.position.set(-4, 0, 0); ST.sun.key.position.set(5, 13, 6);

  // Background coaster loop on the boardwalk
  const stLoop = createLoop('circle', '#C93838');
  stLoop.position.set(-3.5, 0, 18); stLoop.scale.set(1.5, 1.5, 1.5);
  ST.scene.add(stLoop);

  // 1900 vintage ambulance car parked on street
  const stAmbulance = WD.car('#F4EFE4');
  stAmbulance.position.set(1.5, 0, 2); stAmbulance.rotation.y = -0.4;
  // Red cross marker on ambulance roof
  const crossGroup = new THREE.Group();
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), new THREE.MeshBasicMaterial({ color: '#D8343F' }));
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.18), new THREE.MeshBasicMaterial({ color: '#D8343F' }));
  crossGroup.add(c1, c2); crossGroup.position.set(0, 1.85, -0.3);
  stAmbulance.add(crossGroup);
  ST.scene.add(stAmbulance);

  const stBuilder = person('builder'), stRival = person('rival'), stRider = person('rider'), stMedic = person('medic');
  [stBuilder, stRival, stRider, stMedic].forEach((p) => ST.scene.add(p.group));

  // ── Set 2: The Workshop / Drafting Office (OF) ──────────────────────────
  const OF = WD.interior(E, {
    w: 8, depth: 7, wall: '#2C3E50', motif: '#34495E', ceiling: '#1A252F', floor: '#6E4E34',
    signText: 'COASTER DYNAMICS LAB', counterOn: false, litter: false
  });
  const dk = PR.desk(2.4); dk.position.set(0.4, 0, -3.2); OF.scene.add(dk);

  const ofRival = person('rival'), ofBuilder = person('builder');
  [ofRival, ofBuilder].forEach((p) => OF.scene.add(p.group));

  // ── Set 3: Meadow / Park Coaster Grounds (MD) ───────────────────────────
  const MD = WD.meadow(E, { fenceOn: true, treesOn: true });
  MD.sun.key.position.set(9, 14, 8); MD.sun.key.target.position.set(5, 0, -6);

  // Both loops in the test field:
  // Circular Loop (The 1895 death-trap)
  const mdCircleLoop = createLoop('circle', '#C93838');
  mdCircleLoop.position.set(-3.5, 0, -5);
  MD.scene.add(mdCircleLoop);

  // Teardrop Loop (The graceful solution)
  const mdTeardropLoop = createLoop('teardrop', '#2E6FB6');
  mdTeardropLoop.position.set(3.5, 0, -5);
  MD.scene.add(mdTeardropLoop);

  // Coaster carts
  const cartCircle = createCart('#C93838');
  cartCircle.position.set(-3.5, 0.2, -5);
  MD.scene.add(cartCircle);

  const cartTeardrop = createCart('#2E6FB6');
  cartTeardrop.position.set(3.5, 0.2, -5);
  MD.scene.add(cartTeardrop);

  // Characters in test grounds
  const mdBuilder = person('builder'), mdRival = person('rival');
  const mdDummy = person('dummy'), mdRider = person('rider');
  [mdBuilder, mdRival, mdDummy, mdRider].forEach((p) => MD.scene.add(p.group));

  // Splinters debris group for dummy crash
  const splinters = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const sp = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 + (i % 3) * 0.08, 0.08, 0.25 + (i % 4) * 0.1),
      new THREE.MeshStandardMaterial({ color: '#C8935A', roughness: 0.9 })
    );
    sp.position.set((Math.random() - 0.5) * 0.8, 0.2 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8);
    splinters.add(sp);
  }
  splinters.visible = false;
  MD.scene.add(splinters);


  // ═════════════════════════════════════════════════════════════════════════
  // SHOTS
  // ═════════════════════════════════════════════════════════════════════════

  // ── S01 · Line 0: "In eighteen ninety-five, engineers built the world's first upside-down roller coaster,"
  {
    const st = cut(0), wc = Wd('coaster', 0);
    add({
      id: 'S01', at: st, note: 'Boardwalk: Builder proudly unveils towering circular coaster',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        stBuilder.at(-1.2, 0, 1.8);
        stBuilder.set({ mood: 'proud', armR: [45, -40], holdR: PROPS.blueprint, look: [0.2, 0.5], blink: blink(t), talk: talk(t, t < wc) });
        stRival.at(0.8, 0, 2.2);
        stRival.set({ mood: 'smug', armL: [20, 0], look: [-0.2, 0.4], blink: blink(t, 1) });
        stRider.group.visible = false; stMedic.group.visible = false;
        shoot(ST.scene, [stBuilder, stRival], V3(-0.4, 2.0, 7.5), V3(-0.2, 2.6, 5.0), V3(-1.0, 3.2, 12), null, k, LOOKS.street);
        blit();
        drawCaptionTag(ctx, 'CONEY ISLAND · 1895', 540, 200, '#F2C230');
      }
    });
    cue(st + 0.1, 'whoosh', { gain: 0.6 });
    cue(wc, 'ding', { gain: 0.8 });
  }

  // ── S02 · Line 1: "and it nearly snapped riders' necks in half."
  {
    const st = cut(1), wn = Wd('necks', 1);
    add({
      id: 'S02', at: st, note: 'Close-up: Rider in coaster cart clutching bent neck in agony',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        stRider.group.visible = true; stBuilder.group.visible = false; stRival.group.visible = false;
        stRider.at(0, 0.2, 0.5);
        stRider.set({ mood: 'dizzy', armL: [75, -90], armR: [75, -90], lean: 22, look: [0.0, -0.6], blink: blink(t) });
        const shake = (t > wn && t < wn + 0.5) ? (Math.sin(t * 50) * 0.08) : 0;
        shoot(ST.scene, [stRider], V3(0 + shake, 1.5, 3.2), V3(0, 1.35, 2.1), V3(0, 1.1, 0.5), null, k, LOOKS.street);
        blit();
        if (t >= wn) {
          drawCaptionTag(ctx, '⚡ 12 Gs WHIPLASH! ⚡', 540, 240, '#FF4545');
        }
      }
    });
    cue(st, 'whoosh');
    cue(wn, 'pop', { gain: 1.0 });
  }

  // ── S03 · Line 2: "See, they designed the loop as a perfect circle."
  {
    const st = cut(2), wc = Wd('circle', 2);
    add({
      id: 'S03', at: st, note: 'Office: Rival engineer shows circular loop blueprint on desk',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        ofRival.at(0.4, 0, -3.95);
        ofRival.set({ mood: 'smug', armR: [40, -45], holdR: PROPS.blueprint, look: [0.0, 0.2], blink: blink(t), talk: talk(t) });
        ofBuilder.group.visible = false;
        shoot(OF.scene, [ofRival], V3(-0.6, 2.1, -1.0), V3(0.1, 1.8, -2.0), V3(0.4, 1.4, -3.8), null, k, LOOKS.room);
        blit();
        drawCaptionTag(ctx, 'FLIP FLAP RAILWAY: CIRCLE LOOP', 540, 190, '#90CDF4');
      }
    });
    cue(st, 'whoosh'); cue(wc, 'pop', { gain: 0.6 });
  }

  // ── S04 · Line 3: "Which looked clean on paper,"
  {
    const st = cut(3), wc = Wd('paper', 3);
    add({
      id: 'S04', at: st, note: 'Close-up: Circular diagram showing constant radius R',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        shoot(OF.scene, [ofRival], V3(0.2, 1.6, -2.4), V3(0.3, 1.4, -2.9), V3(0.4, 1.1, -3.4), null, k, LOOKS.room);
        blit();
        // 2D diagram of perfect circle loop
        ctx.save();
        ctx.strokeStyle = '#63B3ED'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(540, 780, 180, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#E2E8F0'; ctx.font = '700 28px Inter'; ctx.textAlign = 'center';
        ctx.fillText('RADIUS R = CONSTANT', 540, 1010);
        ctx.restore();
      }
    });
    cue(st, 'whoosh'); cue(wc, 'ding', { gain: 0.6 });
  }

  // ── S05 · Line 4: "but created a brutal twelve Gs of force at the bottom."
  {
    const st = cut(4), wt = Wd('twelve', 4);
    add({
      id: 'S05', at: st, note: 'Test field: Coaster cart slams into bottom of circular loop',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = false; mdRival.group.visible = false; mdDummy.group.visible = false; mdRider.group.visible = false;
        const u = clamp(0.75 + (lt / d) * 0.25);
        const p = mdCircleLoop.curve.getPointAt(u % 1.0);
        cartCircle.position.copy(p).add(new THREE.Vector3(-3.5, 0, -5));
        const shake = (t >= wt) ? (Math.sin(t * 60) * 0.09) : 0;
        shoot(MD.scene, [], V3(-3.5 + shake, 1.4, 1.5), V3(-3.5, 1.1, 0.0), V3(-3.5, 0.8, -5), null, k, LOOKS.field);
        blit();
        drawGauge(ctx, t >= wt ? 12.0 : 4.5 + (lt / d) * 7.5, 540, 360);
      }
    });
    cue(st, 'whoosh'); cue(wt, 'thud', { gain: 1.0 });
  }

  // ── S06 · Line 5: "Riders were blacking out and leaving in ambulances."
  {
    const st = cut(5), wa = Wd('ambulances', 5);
    add({
      id: 'S06', at: st, note: 'Boardwalk: Medic escorts dazed rider into white ambulance',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        stRider.group.visible = true; stMedic.group.visible = true;
        stRider.at(0.4, 0, 1.8);
        stRider.set({ mood: 'dizzy', armL: [60, -80], armR: [60, -80], lean: -15, look: [0, -0.4], blink: blink(t) });
        stMedic.at(1.6, 0, 1.8);
        stMedic.set({ mood: 'worried', armL: [30, -30], look: [-0.4, 0], blink: blink(t, 1), talk: talk(t) });
        shoot(ST.scene, [stRider, stMedic], V3(0.2, 1.8, 5.5), V3(1.0, 1.6, 4.2), V3(1.0, 1.2, 1.5), null, k, LOOKS.street);
        blit();
        drawCaptionTag(ctx, '🚑 HOSPITAL BOUND 🚑', 540, 210, '#E53E3E');
      }
    });
    cue(st, 'whoosh'); cue(wa, 'pop', { gain: 0.7 });
  }

  // ── S07 · Line 6: "So two rival park builders raced to fix it."
  {
    const st = cut(6), wr = Wd('rival', 6);
    add({
      id: 'S07', at: st, note: 'Meadow: Dramatic face-off between Builder and Rival',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = true; mdRival.group.visible = true;
        mdDummy.group.visible = false; mdRider.group.visible = false;
        mdBuilder.at(-1.5, 0, -2.5);
        mdBuilder.set({ mood: 'angry', armR: [40, -40], holdR: PROPS.hammer, look: [0.6, 0.1], blink: blink(t) });
        mdRival.at(1.5, 0, -2.5);
        mdRival.set({ mood: 'smug', armL: [25, 0], look: [-0.6, 0.1], blink: blink(t, 1), talk: talk(t, t > wr) });
        shoot(MD.scene, [mdBuilder, mdRival], V3(0.0, 1.9, 2.0), V3(0.0, 1.6, 0.5), V3(0.0, 1.2, -2.5), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, 'THE ROLLER COASTER WAR', 540, 200, '#F6AD55');
      }
    });
    cue(st, 'whoosh'); cue(wr, 'ding', { gain: 0.7 });
  }

  // ── S08 · Line 7: "One builder grabbed a hammer and bent the track into a tall teardrop,"
  {
    const st = cut(7), wh = Wd('hammer', 7), wt = Wd('teardrop', 7);
    add({
      id: 'S08', at: st, note: 'Builder strikes anvil with hammer, bending track into teardrop',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = true; mdRival.group.visible = false; mdDummy.group.visible = false; mdRider.group.visible = false;
        mdBuilder.at(0, 0, -2.0);
        const swing = Math.sin(lt * 12);
        mdBuilder.set({ mood: 'angry', armR: [60 + swing * 50, -30], holdR: PROPS.hammer, look: [0.1, -0.4], blink: blink(t) });
        shoot(MD.scene, [mdBuilder], V3(-1.4, 1.8, 1.0), V3(-0.6, 1.5, 0.0), V3(0, 1.2, -2.0), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, 'HAMMERING THE CLOTHOID LOOP', 540, 210, '#4FD1C5');
      }
    });
    cue(st, 'whoosh'); cue(wh, 'slam', { gain: 1.0 }); cue(wt, 'ding', { gain: 0.8 });
  }

  // ── S09 · Line 8: "making the bottom curve wide and gentle."
  {
    const st = cut(8), wg = Wd('gentle', 8);
    add({
      id: 'S09', at: st, note: 'Base of teardrop loop: Wide sweeping track entrance',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = true; mdRival.group.visible = false; mdDummy.group.visible = false; mdRider.group.visible = false;
        mdBuilder.at(2.2, 0, -3.5);
        mdBuilder.set({ mood: 'proud', armL: [30, 0], look: [-0.4, 0.2], blink: blink(t) });
        shoot(MD.scene, [mdBuilder], V3(3.5, 1.8, 3.5), V3(3.5, 1.4, 1.5), V3(3.5, 0.9, -5.0), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, 'WIDE RADIUS = GENTLE ENTRY (3 Gs)', 540, 220, '#68D391');
      }
    });
    cue(st, 'whoosh'); cue(wg, 'ding', { gain: 0.8 });
  }

  // ── S10 · Line 9: "His rival laughed, calling the skinny loop completely dangerous."
  {
    const st = cut(9), wl = Wd('laughed', 9);
    add({
      id: 'S10', at: st, note: 'Rival points and laughs mockingly at teardrop shape',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = false; mdRival.group.visible = true; mdDummy.group.visible = false; mdRider.group.visible = false;
        mdRival.at(0, 0, -2.0);
        mdRival.set({ mood: 'laugh', armL: [45, -60], armR: [45, -60], bob: Math.sin(t * 14) * 12, look: [-0.4, 0.1], blink: blink(t), talk: talk(t) });
        shoot(MD.scene, [mdRival], V3(0.5, 1.8, 0.8), V3(0.0, 1.5, -0.4), V3(0, 1.2, -2.0), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, 'HA! THAT SKINNY LOOP WILL FAIL!', 540, 210, '#CBD5E0');
      }
    });
    cue(st, 'whoosh'); cue(wl, 'pop', { gain: 0.8 });
  }

  // ── S11 · Line 10: "He strapped a wooden test dummy into his own circular loop,"
  {
    const st = cut(10), wd = Wd('dummy', 10);
    add({
      id: 'S11', at: st, note: 'Rival locks wooden dummy into circular loop coaster cart',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = false; mdRider.group.visible = false;
        mdRival.group.visible = true; mdDummy.group.visible = true;
        mdRival.at(-2.5, 0, -3.5);
        mdRival.set({ mood: 'smug', armR: [35, -45], look: [-0.3, -0.3], blink: blink(t) });
        mdDummy.at(-3.5, 0.2, -4.0);
        mdDummy.set({ mood: 'neutral', armL: [10, 0], armR: [10, 0], look: [0, 0], legs: 'sit' });
        shoot(MD.scene, [mdRival, mdDummy], V3(-3.0, 1.8, -0.5), V3(-3.0, 1.5, -1.8), V3(-3.2, 0.8, -4.0), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, 'WOODEN CRASH DUMMY #1', 540, 220, '#ECC94B');
      }
    });
    cue(st, 'whoosh'); cue(wd, 'ding', { gain: 0.6 });
  }

  // ── S12 · Line 11: "and sent the cart flying down the track."
  {
    const st = cut(11), wf = Wd('flying', 11);
    add({
      id: 'S12', at: st, note: 'Cart with wooden dummy races down drop hill toward circle loop',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = false; mdRival.group.visible = false; mdRider.group.visible = false;
        mdDummy.group.visible = true;
        const progress = clamp(lt / d);
        cartCircle.position.set(-3.5, 3.8 - progress * 3.4, -5.0 + (1 - progress) * 4.0);
        mdDummy.at(cartCircle.position.x, cartCircle.position.y + 0.1, cartCircle.position.z);
        mdDummy.set({ mood: 'shock', armL: [70, -30], armR: [70, -30], look: [0, -0.5], legs: 'sit' });
        shoot(MD.scene, [mdDummy], V3(-2.0, 3.0, 1.0), V3(-2.4, 2.2, -0.5), cartCircle.position, null, k, LOOKS.field);
        blit();
      }
    });
    cue(st, 'whoosh'); cue(wf, 'whoosh', { gain: 1.0 });
  }

  // ── S13 · Line 12: "At the bottom, the dummy was instantly crushed into splinters."
  {
    const st = cut(12), ws = Wd('splinters', 12);
    add({
      id: 'S13', at: st, note: '12 Gs impact: Dummy shatters into wooden splinters at bottom',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = false; mdRider.group.visible = false; mdRival.group.visible = true;
        const impact = t >= ws;
        cartCircle.position.set(-3.5, 0.2, -5.0);
        if (impact) {
          mdDummy.group.visible = false;
          splinters.visible = true;
          splinters.position.copy(cartCircle.position);
          const el = t - ws;
          splinters.children.forEach((sp) => {
            sp.position.y += el * 0.1;
            sp.rotation.x += el * 2.0;
          });
        }
        mdRival.at(-2.0, 0, -3.5);
        mdRival.set({ mood: 'shock', armL: [80, -90], armR: [80, -90], look: [-0.6, -0.3], blink: blink(t) });
        const shake = impact ? (Math.sin(t * 50) * 0.08) : 0;
        shoot(MD.scene, [mdRival], V3(-3.5 + shake, 1.6, 1.5), V3(-3.5, 1.3, 0.0), V3(-3.5, 0.8, -5.0), null, k, LOOKS.field);
        blit();
        if (impact) {
          drawGauge(ctx, 12.0, 540, 320);
          drawCaptionTag(ctx, '💥 CRUSHED TO SPLINTERS! 💥', 540, 520, '#FF4545');
        }
      }
    });
    cue(st, 'whoosh'); cue(ws, 'thud', { gain: 1.0 });
  }

  // ── S14 · Line 13: "Meanwhile, the teardrop loop worked like magic:"
  {
    const st = cut(13), wm = Wd('magic', 13);
    add({
      id: 'S14', at: st, note: 'Teardrop loop coaster glides effortlessly into smooth orbit',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        splinters.visible = false;
        mdRival.group.visible = false; mdDummy.group.visible = false; mdRider.group.visible = false;
        mdBuilder.group.visible = true;
        const u = clamp(0.0 + (lt / d) * 0.45);
        const p = mdTeardropLoop.curve.getPointAt(u);
        cartTeardrop.position.copy(p).add(new THREE.Vector3(3.5, 0, -5));
        mdBuilder.at(1.8, 0, -3.0);
        mdBuilder.set({ mood: 'proud', armR: [50, -40], look: [0.3, 0.4], blink: blink(t) });
        // Frame entire teardrop loop and builder from 10m back
        shoot(MD.scene, [mdBuilder], V3(3.5, 2.8, 7.5), V3(3.5, 2.4, 6.0), V3(3.5, 2.4, -5.0), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, '✨ THE CLOTHOID TEARDROP ✨', 540, 210, '#38B2AC');
      }
    });
    cue(st, 'whoosh'); cue(wm, 'ding', { gain: 0.9 });
  }

  // ── S15 · Line 14: "it kept the curve wide where the cart was fast,"
  {
    const st = cut(14), wf = Wd('fast', 14);
    add({
      id: 'S15', at: st, note: 'Slow-motion breakdown: Wide radius at bottom lowers G-force',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = false; mdRival.group.visible = false; mdDummy.group.visible = false; mdRider.group.visible = false;
        const u = clamp(0.08 + (lt / d) * 0.18);
        const p = mdTeardropLoop.curve.getPointAt(u);
        cartTeardrop.position.copy(p).add(new THREE.Vector3(3.5, 0, -5));
        shoot(MD.scene, [], V3(3.5, 1.8, 2.5), V3(3.5, 1.4, 1.0), V3(3.5, 0.9, -5.0), null, k, LOOKS.field);
        blit();
        drawGauge(ctx, 3.2, 540, 320);
        drawCaptionTag(ctx, 'WIDE RADIUS = ONLY 3.2 Gs', 540, 500, '#48BB78');
      }
    });
    cue(st, 'whoosh'); cue(wf, 'pop', { gain: 0.7 });
  }

  // ── S16 · Line 15: "and sharp at the top where the cart slowed down."
  {
    const st = cut(15), ws = Wd('slowed', 15);
    add({
      id: 'S16', at: st, note: 'Apex view: Cart upside down at top where speed is gentle',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdBuilder.group.visible = false; mdRival.group.visible = false; mdDummy.group.visible = false; mdRider.group.visible = false;
        const u = clamp(0.42 + (lt / d) * 0.16);
        const p = mdTeardropLoop.curve.getPointAt(u);
        cartTeardrop.position.copy(p).add(new THREE.Vector3(3.5, 0, -5));
        shoot(MD.scene, [], V3(3.5, 4.8, 1.5), V3(3.5, 4.6, 0.0), V3(3.5, 4.6, -5.0), null, k, LOOKS.field);
        blit();
        drawGauge(ctx, 1.2, 540, 320);
        drawCaptionTag(ctx, 'SHARP APEX = WEIGHTLESS FLOAT', 540, 500, '#63B3ED');
      }
    });
    cue(st, 'whoosh'); cue(ws, 'ding', { gain: 0.7 });
  }

  // ── S17 · Line 16: "Which is why today, every looping coaster on Earth uses that bent teardrop,"
  {
    const st = cut(16), we = Wd('Earth', 16);
    add({
      id: 'S17', at: st, note: 'Modern theme park vista: Towering modern teardrop loops',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdDummy.group.visible = false; mdRider.group.visible = false;
        mdBuilder.group.visible = true;
        mdBuilder.at(-1.4, 0, 0.0);
        mdBuilder.set({ mood: 'proud', armL: [30, 0], armR: [30, 0], look: [0.3, 0.4], blink: blink(t) });
        shoot(MD.scene, [mdBuilder], V3(0, 3.8, 9.5), V3(0, 3.0, 7.0), V3(0, 2.2, -5.0), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, '100% OF MODERN LOOPING COASTERS', 540, 210, '#ECC94B');
      }
    });
    cue(st, 'whoosh'); cue(we, 'ding', { gain: 0.8 });
  }

  // ── S18 · Line 17: "saving millions of riders from twelve Gs of neck-snapping force."
  {
    const st = cut(17), wf = Wd('force', 17);
    add({
      id: 'S18', at: st, note: 'Finale: Builder gives thumbs up in front of safe teardrop coaster',
      draw(lt, d, t, blit) {
        const k = eio(clamp(lt / d));
        mdDummy.group.visible = false;
        mdBuilder.group.visible = true; mdRider.group.visible = true;
        mdBuilder.at(-1.1, 0, -1.2);
        mdBuilder.set({ mood: 'proud', armR: [45, -70], look: [0.1, 0.1], blink: blink(t), talk: talk(t, t < wf) });
        mdRider.at(1.1, 0, -1.2);
        mdRider.set({ mood: 'happy', armL: [50, -40], armR: [50, -40], look: [-0.1, 0.1], blink: blink(t, 1) });
        shoot(MD.scene, [mdBuilder, mdRider], V3(0.0, 1.8, 3.2), V3(0.0, 1.5, 2.0), V3(0.0, 1.2, -1.2), null, k, LOOKS.field);
        blit();
        drawCaptionTag(ctx, 'THE SHAPE THAT SAVED COASTERS', 540, 210, '#48BB78');
      }
    });
    cue(st, 'whoosh'); cue(wf, 'ding', { gain: 1.0 });
  }

  return { shots: S, cues: CUES };
}
