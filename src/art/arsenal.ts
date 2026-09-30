/** Expansion III: individually drawn silhouettes, not variants of stock parts.
 * Coordinates are design units; all weapons face right. */
import { circle, ellipse, lamp, line, plate, poly, recess, rivet, rrect, seam, stripes, vents } from './kit'
import type { PartArt } from './parts'
import type { Ramp } from './palette'

const STEEL: Ramp = ['#edf4fa', '#97a8b8', '#394a5b']
const DARK: Ramp = ['#657382', '#303d4b', '#131c28']

/** Every entry owns its geometry and mount/muzzle metadata. Shared primitives
 * provide material consistency, never a shared weapon silhouette. */
export const ARSENAL_ART: Readonly<Record<string, PartArt>> = {
  'anchor-driver': {
    w: 146, h: 66, anchor: { x: 23, y: 35 }, muzzle: { x: 142, y: 29 },
    draw(c, p) {
      // Hydraulic pile driver: exposed ram, forked muzzle and chain magazine.
      plate(c, poly([5, 22, 26, 12, 65, 12, 78, 23, 70, 48, 20, 50, 5, 40]), p.body)
      plate(c, rrect(62, 24, 73, 10, 3), STEEL)
      plate(c, poly([72, 12, 136, 12, 143, 21, 81, 21]), p.frame)
      plate(c, poly([80, 38, 143, 38, 134, 48, 73, 48]), p.frame)
      plate(c, poly([127, 8, 143, 10, 143, 24, 131, 24]), p.trim)
      plate(c, poly([131, 35, 143, 35, 143, 52, 127, 54]), p.trim)
      for (let x = 83; x < 124; x += 10) line(c, x, 26, x, 32, '#334354', 2)
      for (let x = 29; x < 65; x += 10) plate(c, ellipse(x, 55, 5, 7), DARK, { lw: 2 })
      stripes(c, rrect(34, 18, 27, 12, 2), p.trim[1], 4)
      recess(c, circle(23, 35, 9)); rivet(c, 23, 35, 4)
      seam(c, 35, 40, 62, 40)
    },
  },
  'kiln-bellows': {
    w: 131, h: 74, anchor: { x: 23, y: 42 }, muzzle: { x: 127, y: 34 },
    draw(c, p) {
      // Bulbous pressure vessel, accordion bellows and flared ceramic nozzle.
      plate(c, ellipse(35, 40, 31, 26), p.body)
      plate(c, rrect(26, 4, 18, 20, 5), p.frame)
      recess(c, rrect(30, 7, 10, 10, 2)); lamp(c, circle(35, 12, 3), p.glow, 0.5)
      for (let x = 57; x < 95; x += 7) plate(c, rrect(x, 20, 10, 32, 3), DARK, { lw: 2 })
      plate(c, poly([94, 22, 120, 13, 128, 17, 128, 51, 120, 55, 94, 46]), STEEL)
      recess(c, ellipse(123, 34, 4, 14)); lamp(c, ellipse(123, 34, 2, 10), p.glow, 0.8)
      plate(c, poly([20, 60, 54, 60, 60, 68, 15, 68]), p.trim)
      vents(c, 17, 29, 32, 19, 3)
      rivet(c, 23, 42, 4); rivet(c, 48, 23)
      line(c, 40, 59, 78, 59, p.trim[1], 4); line(c, 78, 59, 78, 51, p.trim[1], 4)
    },
  },
  'prism-fork': {
    w: 153, h: 69, anchor: { x: 24, y: 36 }, muzzle: { x: 147, y: 34 },
    draw(c, p) {
      // Open tuning fork around a suspended crystal, not a closed laser barrel.
      plate(c, poly([5, 28, 30, 15, 59, 20, 68, 34, 59, 52, 27, 56, 5, 44]), p.body)
      plate(c, poly([51, 20, 117, 6, 147, 19, 143, 25, 114, 18, 63, 31]), STEEL)
      plate(c, poly([63, 40, 114, 50, 143, 43, 147, 49, 117, 63, 51, 52]), STEEL)
      lamp(c, poly([82, 34, 105, 23, 122, 34, 105, 45]), p.glow, 0.75)
      for (const x of [74, 91, 108]) {
        line(c, x, 15, x + 3, 22, p.trim[1], 4)
        line(c, x, 49, x + 3, 57, p.trim[1], 4)
      }
      plate(c, circle(24, 36, 10), p.frame); rivet(c, 24, 36, 4)
      vents(c, 36, 29, 18, 17, 3)
    },
  },
  'cinder-siphon': {
    w: 140, h: 79, anchor: { x: 24, y: 43 }, muzzle: { x: 135, y: 32 },
    draw(c, p) {
      // Twin dangling coolant bottles feed a perforated heat exchanger.
      for (const x of [40, 61]) {
        plate(c, rrect(x, 44, 17, 31, 6), STEEL)
        lamp(c, rrect(x + 5, 51, 7, 17, 2), p.glow, 0.4)
      }
      plate(c, poly([6, 26, 35, 14, 83, 19, 91, 46, 30, 55, 6, 46]), p.body)
      plate(c, poly([81, 20, 125, 13, 137, 21, 137, 43, 125, 51, 81, 44]), DARK)
      for (let x = 91; x < 128; x += 9) plate(c, rrect(x, 18, 4, 28, 1), STEEL, { lw: 1.3 })
      lamp(c, ellipse(133, 32, 3, 8), p.glow, 0.7)
      line(c, 49, 47, 49, 37, p.trim[1], 4); line(c, 70, 47, 70, 34, p.trim[1], 4)
      plate(c, circle(24, 43, 9), p.frame); rivet(c, 24, 43, 3)
      vents(c, 35, 23, 38, 14, 3)
    },
  },
  'relay-leech': {
    w: 139, h: 82, anchor: { x: 24, y: 39 }, muzzle: { x: 135, y: 30 },
    draw(c, p) {
      // Offset transformer box, hanging cable loop and needle antenna array.
      line(c, 43, 47, 43, 73, '#111923', 7); line(c, 43, 73, 80, 73, '#111923', 7)
      line(c, 80, 73, 80, 44, '#111923', 7)
      line(c, 44, 49, 44, 72, p.trim[1], 2); line(c, 44, 72, 79, 72, p.trim[1], 2)
      plate(c, poly([5, 23, 21, 12, 67, 12, 84, 26, 77, 56, 15, 56, 5, 45]), p.body)
      plate(c, rrect(81, 22, 32, 16, 3), DARK)
      for (const [y, end] of [[13, 121], [30, 135], [47, 125]]) {
        line(c, 102, 30, 113, y, STEEL[1], 5)
        line(c, 113, y, end, y, STEEL[0], 3)
        lamp(c, circle(end, y, 3), p.glow, 0.7)
      }
      for (let x = 38; x < 72; x += 7) plate(c, rrect(x, 19, 4, 30, 1), STEEL, { lw: 1 })
      plate(c, circle(24, 39, 9), p.frame); rivet(c, 24, 39, 3)
      lamp(c, rrect(16, 17, 12, 4, 1), p.glow, 0.4)
    },
  },
  'sawtooth-carbine': {
    w: 153, h: 72, anchor: { x: 24, y: 35 }, muzzle: { x: 149, y: 24 },
    draw(c, p) {
      // Triangular drum and toothed under-barrel rail.
      plate(c, poly([4, 24, 27, 16, 34, 35, 18, 46, 4, 40]), p.frame)
      plate(c, rrect(36, 18, 110, 12, 3), STEEL)
      plate(c, poly([38, 31, 67, 31, 81, 56, 57, 68, 33, 57]), p.body)
      recess(c, circle(55, 49, 12)); plate(c, circle(55, 49, 7), p.trim)
      for (let x = 80; x < 138; x += 12) plate(c, poly([x, 32, x + 10, 32, x + 5, 43]), p.trim, { lw: 2 })
      plate(c, rrect(29, 11, 46, 22, 4), p.body)
      plate(c, rrect(139, 14, 11, 20, 2), DARK); recess(c, rrect(145, 20, 4, 8, 1))
      vents(c, 38, 17, 27, 10, 3, true)
      rivet(c, 24, 35, 4); seam(c, 82, 22, 131, 22)
    },
  },
  'dice-howitzer': {
    w: 127, h: 112, anchor: { x: 42, y: 98 }, muzzle: { x: 122, y: 27 },
    draw(c, p) {
      // Angular revolver turret with six chambers, elevated slanted barrel.
      plate(c, rrect(23, 89, 42, 20, 4), p.frame)
      plate(c, poly([32, 87, 31, 64, 62, 64, 55, 91]), DARK)
      plate(c, poly([52, 31, 108, 10, 123, 16, 123, 37, 67, 53]), STEEL)
      plate(c, poly([17, 31, 42, 17, 67, 31, 67, 61, 42, 76, 17, 61]), p.body)
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3
        recess(c, circle(42 + Math.cos(a) * 17, 47 + Math.sin(a) * 17, 5))
      }
      plate(c, circle(42, 47, 8), p.trim); rivet(c, 42, 47, 3)
      plate(c, poly([104, 11, 123, 16, 123, 37, 105, 34]), DARK)
      recess(c, ellipse(119, 26, 3, 7))
      stripes(c, rrect(28, 94, 32, 8, 2), p.trim[1], 4)
    },
  },
  'furnace-organ': {
    w: 127, h: 121, anchor: { x: 51, y: 106 }, muzzle: { x: 122, y: 25 },
    draw(c, p) {
      // Three stepped organ pipes with brass exhausts and a pressure dial.
      plate(c, rrect(28, 98, 48, 20, 4), p.frame)
      for (const [x, y, h] of [[10, 40, 43], [40, 23, 60], [70, 6, 77]]) {
        plate(c, rrect(x, y, 25, h, 5), p.body)
        plate(c, poly([x + 4, y + 4, x + 31, y + 1, x + 49, y + 9, x + 49, y + 24, x + 26, y + 20, x + 4, y + 23]), STEEL)
        lamp(c, ellipse(x + 46, y + 16, 3, 6), p.glow, 0.6)
        vents(c, x + 5, y + 27, 15, h - 30, 3)
      }
      plate(c, poly([13, 80, 96, 80, 105, 96, 22, 100]), DARK)
      plate(c, circle(52, 88, 8), STEEL)
      line(c, 52, 88, 57, 83, p.trim[1], 2); rivet(c, 51, 106, 3)
    },
  },
  'storm-astrolabe': {
    w: 126, h: 117, anchor: { x: 49, y: 104 }, muzzle: { x: 122, y: 43 },
    draw(c, p) {
      // Gyroscopic rings and floating electrode sphere on a telescope cradle.
      plate(c, rrect(28, 97, 43, 17, 4), p.frame)
      plate(c, poly([38, 98, 33, 80, 62, 79, 60, 98]), DARK)
      plate(c, ellipse(51, 46, 43, 38), STEEL)
      recess(c, ellipse(51, 46, 34, 29))
      plate(c, ellipse(51, 46, 17, 40, -0.55), p.trim)
      recess(c, ellipse(51, 46, 10, 30, -0.55))
      lamp(c, circle(51, 46, 15), p.glow, 1.1)
      plate(c, poly([88, 33, 122, 38, 122, 48, 89, 57]), p.body)
      lamp(c, ellipse(119, 43, 3, 5), p.glow, 0.5)
      for (const [x, y] of [[20, 19], [82, 20], [21, 74], [82, 74]]) rivet(c, x, y, 3)
      line(c, 50, 84, 50, 96, p.glow, 3)
    },
  },
  'ballista-crown': {
    w: 162, h: 101, anchor: { x: 43, y: 87 }, muzzle: { x: 157, y: 39 },
    draw(c, p) {
      // Horizontal bow limbs, taut string and long sabot rail.
      plate(c, rrect(22, 79, 43, 19, 4), p.frame)
      plate(c, poly([31, 80, 36, 46, 58, 46, 55, 80]), DARK)
      line(c, 120, 6, 51, 39, '#d0d8e2', 2)
      line(c, 51, 39, 120, 71, '#d0d8e2', 2)
      plate(c, poly([69, 31, 89, 10, 119, 3, 125, 9, 100, 22, 88, 37]), p.trim)
      plate(c, poly([88, 42, 100, 56, 125, 66, 119, 74, 88, 65, 69, 45]), p.trim)
      plate(c, rrect(22, 33, 130, 12, 3), STEEL)
      plate(c, poly([142, 29, 158, 39, 142, 49]), STEEL)
      plate(c, poly([15, 27, 63, 27, 74, 40, 64, 54, 15, 54]), p.body)
      vents(c, 26, 34, 26, 13, 3, true); seam(c, 80, 39, 139, 39)
      rivet(c, 43, 87, 3); rivet(c, 22, 40, 3)
    },
  },
  'ember-manta': {
    w: 118, h: 71, anchor: { x: 59, y: 35 }, muzzle: { x: 113, y: 34 },
    draw(c, p) {
      // Manta wings, split exhaust tail and underslung glowing furnace.
      plate(c, poly([42, 24, 13, 3, 4, 10, 18, 40, 43, 44]), p.trim)
      plate(c, poly([43, 39, 13, 66, 5, 59, 19, 32]), p.frame)
      plate(c, poly([33, 24, 73, 14, 105, 24, 115, 35, 104, 46, 69, 51, 34, 44]), p.body)
      plate(c, ellipse(62, 49, 20, 12), DARK)
      lamp(c, ellipse(62, 50, 12, 6), p.glow, 0.9)
      recess(c, ellipse(107, 34, 5, 7)); lamp(c, circle(109, 34, 3), p.glow, 0.7)
      vents(c, 45, 26, 34, 14, 3)
      plate(c, poly([20, 23, 34, 26, 34, 40, 20, 45]), STEEL)
      rivet(c, 86, 24); rivet(c, 88, 44); seam(c, 39, 23, 68, 17)
    },
  },
  'capacitor-jelly': {
    w: 96, h: 107, anchor: { x: 46, y: 39 }, muzzle: { x: 90, y: 37 },
    draw(c, p) {
      // Hovering jellyfish dome with four hanging capacitor tentacles.
      for (const [x, end] of [[23, 88], [39, 102], [55, 96], [71, 82]]) {
        line(c, x, 48, x - 3, end - 10, STEEL[1], 4)
        plate(c, rrect(x - 8, end - 20, 12, 18, 4), p.frame)
        lamp(c, circle(x - 2, end - 6, 3), p.glow, 0.8)
      }
      plate(c, poly([6, 35, 12, 17, 30, 5, 59, 5, 78, 19, 85, 35, 72, 52, 22, 52]), p.body)
      plate(c, rrect(5, 32, 80, 15, 6), STEEL)
      lamp(c, ellipse(45, 23, 14, 10), p.glow, 0.8)
      plate(c, poly([81, 30, 93, 34, 93, 42, 81, 47]), p.frame)
      lamp(c, ellipse(90, 37, 2, 4), p.glow, 0.5)
      for (const x of [20, 36, 52, 68]) recess(c, rrect(x, 36, 8, 6, 2))
      rivet(c, 17, 25); rivet(c, 72, 25)
    },
  },
}
