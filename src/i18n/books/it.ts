import type { BookNames } from './types.ts';

/**
 * The books in Italian, named as the CEI edition names them — the version nearly every Italian
 * reader meets, whichever translation they then read.
 *
 * Aliases are matched after accents are folded away, so `Giosuè` is found by `giosue` and
 * `Michea` by `michea` without an entry of its own. The books beginning with `G` are the ones to
 * watch: Genesi, Giosuè, Giudici, Giobbe, Gioele, Giona, Giovanni, Giacomo and Giuda all crowd
 * the same two letters, so each claims a spelling no other does and `bookNameCollisions` is what
 * says so.
 */
export const itBooks: BookNames = {
  Gen: { name: 'Genesi', abbreviation: 'Gen', aliases: ['gen', 'genesi'] },
  Exod: { name: 'Esodo', abbreviation: 'Es', aliases: ['es', 'esodo'] },
  Lev: { name: 'Levitico', abbreviation: 'Lv', aliases: ['lv', 'levitico'] },
  Num: { name: 'Numeri', abbreviation: 'Nm', aliases: ['nm', 'numeri'] },
  Deut: { name: 'Deuteronomio', abbreviation: 'Dt', aliases: ['dt', 'deuteronomio'] },
  Josh: { name: 'Giosuè', abbreviation: 'Gs', aliases: ['gs', 'giosue'] },
  Judg: { name: 'Giudici', abbreviation: 'Gdc', aliases: ['gdc', 'giudici'] },
  Ruth: { name: 'Rut', abbreviation: 'Rt', aliases: ['rt', 'rut', 'ruth'] },
  '1Sam': { name: '1 Samuele', abbreviation: '1Sam', aliases: ['1sam', '1samuele'] },
  '2Sam': { name: '2 Samuele', abbreviation: '2Sam', aliases: ['2sam', '2samuele'] },
  '1Kgs': { name: '1 Re', abbreviation: '1Re', aliases: ['1re'] },
  '2Kgs': { name: '2 Re', abbreviation: '2Re', aliases: ['2re'] },
  '1Chr': { name: '1 Cronache', abbreviation: '1Cr', aliases: ['1cr', '1cronache'] },
  '2Chr': { name: '2 Cronache', abbreviation: '2Cr', aliases: ['2cr', '2cronache'] },
  Ezra: { name: 'Esdra', abbreviation: 'Esd', aliases: ['esd', 'esdra'] },
  Neh: { name: 'Neemia', abbreviation: 'Ne', aliases: ['ne', 'neemia'] },
  Esth: { name: 'Ester', abbreviation: 'Est', aliases: ['est', 'ester'] },
  Job: { name: 'Giobbe', abbreviation: 'Gb', aliases: ['gb', 'giobbe'] },
  Ps: {
    name: 'Salmi',
    referenceName: 'Salmo',
    abbreviation: 'Sal',
    aliases: ['sal', 'salmo', 'salmi'],
  },
  Prov: { name: 'Proverbi', abbreviation: 'Pr', aliases: ['pr', 'proverbi'] },
  // The Riveduta's Ecclesiaste; `qo` and `qoelet` are what CEI prints, and both are accepted.
  Eccl: {
    name: 'Ecclesiaste',
    abbreviation: 'Ec',
    aliases: ['ec', 'ecclesiaste', 'qoelet', 'qo'],
  },
  Song: { name: 'Cantico dei Cantici', abbreviation: 'Ct', aliases: ['ct', 'cantico'] },
  Isa: { name: 'Isaia', abbreviation: 'Is', aliases: ['is', 'isaia'] },
  Jer: { name: 'Geremia', abbreviation: 'Ger', aliases: ['ger', 'geremia'] },
  Lam: { name: 'Lamentazioni', abbreviation: 'Lam', aliases: ['lam', 'lamentazioni'] },
  Ezek: { name: 'Ezechiele', abbreviation: 'Ez', aliases: ['ez', 'ezechiele'] },
  Dan: { name: 'Daniele', abbreviation: 'Dn', aliases: ['dn', 'daniele'] },
  Hos: { name: 'Osea', abbreviation: 'Os', aliases: ['os', 'osea'] },
  Joel: { name: 'Gioele', abbreviation: 'Gl', aliases: ['gl', 'gioele'] },
  Amos: { name: 'Amos', abbreviation: 'Am', aliases: ['am', 'amos'] },
  Obad: { name: 'Abdia', abbreviation: 'Abd', aliases: ['abd', 'abdia'] },
  Jonah: { name: 'Giona', abbreviation: 'Giona', aliases: ['giona'] },
  Mic: { name: 'Michea', abbreviation: 'Mi', aliases: ['mi', 'michea'] },
  Nah: { name: 'Naum', abbreviation: 'Na', aliases: ['na', 'naum'] },
  Hab: { name: 'Abacuc', abbreviation: 'Ab', aliases: ['ab', 'abacuc'] },
  Zeph: { name: 'Sofonia', abbreviation: 'Sof', aliases: ['sof', 'sofonia'] },
  Hag: { name: 'Aggeo', abbreviation: 'Ag', aliases: ['ag', 'aggeo'] },
  Zech: { name: 'Zaccaria', abbreviation: 'Zc', aliases: ['zc', 'zaccaria'] },
  Mal: { name: 'Malachia', abbreviation: 'Ml', aliases: ['ml', 'malachia'] },
  Matt: { name: 'Matteo', abbreviation: 'Mt', aliases: ['mt', 'matteo'] },
  Mark: { name: 'Marco', abbreviation: 'Mc', aliases: ['mc', 'marco'] },
  Luke: { name: 'Luca', abbreviation: 'Lc', aliases: ['lc', 'luca'] },
  John: { name: 'Giovanni', abbreviation: 'Gv', aliases: ['gv', 'giovanni'] },
  Acts: { name: 'Atti', abbreviation: 'At', aliases: ['at', 'atti'] },
  Rom: { name: 'Romani', abbreviation: 'Rm', aliases: ['rm', 'romani'] },
  '1Cor': { name: '1 Corinzi', abbreviation: '1Cor', aliases: ['1cor', '1corinzi'] },
  '2Cor': { name: '2 Corinzi', abbreviation: '2Cor', aliases: ['2cor', '2corinzi'] },
  Gal: { name: 'Galati', abbreviation: 'Gal', aliases: ['gal', 'galati'] },
  Eph: { name: 'Efesini', abbreviation: 'Ef', aliases: ['ef', 'efesini'] },
  Phil: { name: 'Filippesi', abbreviation: 'Fil', aliases: ['fil', 'filippesi'] },
  Col: { name: 'Colossesi', abbreviation: 'Col', aliases: ['col', 'colossesi'] },
  '1Thess': {
    name: '1 Tessalonicesi',
    abbreviation: '1Ts',
    aliases: ['1ts', '1tessalonicesi'],
  },
  '2Thess': {
    name: '2 Tessalonicesi',
    abbreviation: '2Ts',
    aliases: ['2ts', '2tessalonicesi'],
  },
  '1Tim': { name: '1 Timoteo', abbreviation: '1Tm', aliases: ['1tm', '1timoteo'] },
  '2Tim': { name: '2 Timoteo', abbreviation: '2Tm', aliases: ['2tm', '2timoteo'] },
  Titus: { name: 'Tito', abbreviation: 'Tt', aliases: ['tt', 'tito'] },
  Phlm: { name: 'Filemone', abbreviation: 'Fm', aliases: ['fm', 'filemone'] },
  Heb: { name: 'Ebrei', abbreviation: 'Eb', aliases: ['eb', 'ebrei'] },
  Jas: { name: 'Giacomo', abbreviation: 'Gc', aliases: ['gc', 'giacomo'] },
  '1Pet': { name: '1 Pietro', abbreviation: '1Pt', aliases: ['1pt', '1pietro'] },
  '2Pet': { name: '2 Pietro', abbreviation: '2Pt', aliases: ['2pt', '2pietro'] },
  '1John': { name: '1 Giovanni', abbreviation: '1Gv', aliases: ['1gv', '1giovanni'] },
  '2John': { name: '2 Giovanni', abbreviation: '2Gv', aliases: ['2gv', '2giovanni'] },
  '3John': { name: '3 Giovanni', abbreviation: '3Gv', aliases: ['3gv', '3giovanni'] },
  Jude: { name: 'Giuda', abbreviation: 'Gd', aliases: ['gd', 'giuda'] },
  Rev: { name: 'Apocalisse', abbreviation: 'Ap', aliases: ['ap', 'apocalisse'] },
};
