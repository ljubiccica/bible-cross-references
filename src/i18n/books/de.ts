import type { BookNames } from './types.ts';

/**
 * The books in German, named as the Lutherbibel names them — `1. Mose` rather than `Genesis`,
 * which is what a German reader meets in print and on the spine.
 *
 * Abbreviations follow the Loccumer Richtlinien, the convention German Bibles and commentaries
 * have shared since 1971, so the arcs axis reads the way a concordance does.
 *
 * Aliases carry the Latin names as well (`genesis`, `exodus`): a reader who learned the books in
 * a Catholic Bible or at university types those, and nothing is lost by understanding both.
 * They are matched after accents are folded away, so `Röm` is found by `rom` and `Hebräer` by
 * `hebraer` without an entry of its own.
 */
export const deBooks: BookNames = {
  Gen: { name: '1. Mose', abbreviation: '1Mo', aliases: ['1mo', '1mose', 'genesis', 'gen'] },
  Exod: { name: '2. Mose', abbreviation: '2Mo', aliases: ['2mo', '2mose', 'exodus', 'ex'] },
  Lev: { name: '3. Mose', abbreviation: '3Mo', aliases: ['3mo', '3mose', 'levitikus', 'lev'] },
  Num: { name: '4. Mose', abbreviation: '4Mo', aliases: ['4mo', '4mose', 'numeri', 'num'] },
  Deut: {
    name: '5. Mose',
    abbreviation: '5Mo',
    aliases: ['5mo', '5mose', 'deuteronomium', 'dtn'],
  },
  Josh: { name: 'Josua', abbreviation: 'Jos', aliases: ['jos', 'josua'] },
  Judg: { name: 'Richter', abbreviation: 'Ri', aliases: ['ri', 'richter'] },
  Ruth: { name: 'Rut', abbreviation: 'Rut', aliases: ['rut', 'ruth'] },
  '1Sam': { name: '1. Samuel', abbreviation: '1Sam', aliases: ['1sam'] },
  '2Sam': { name: '2. Samuel', abbreviation: '2Sam', aliases: ['2sam'] },
  '1Kgs': { name: '1. Könige', abbreviation: '1Kön', aliases: ['1kon', '1koen', '1kge'] },
  '2Kgs': { name: '2. Könige', abbreviation: '2Kön', aliases: ['2kon', '2koen', '2kge'] },
  '1Chr': { name: '1. Chronik', abbreviation: '1Chr', aliases: ['1chr', '1chronik'] },
  '2Chr': { name: '2. Chronik', abbreviation: '2Chr', aliases: ['2chr', '2chronik'] },
  Ezra: { name: 'Esra', abbreviation: 'Esr', aliases: ['esr', 'esra'] },
  Neh: { name: 'Nehemia', abbreviation: 'Neh', aliases: ['neh', 'nehemia'] },
  Esth: { name: 'Ester', abbreviation: 'Est', aliases: ['est', 'ester', 'esther'] },
  Job: { name: 'Hiob', abbreviation: 'Hiob', aliases: ['hiob', 'ijob', 'hi'] },
  Ps: {
    name: 'Psalmen',
    referenceName: 'Psalm',
    abbreviation: 'Ps',
    aliases: ['ps', 'psalm', 'psalmen'],
  },
  Prov: { name: 'Sprüche', abbreviation: 'Spr', aliases: ['spr', 'spruche', 'sprueche'] },
  // `koh` as well as `kohelet`: the Einheitsübersetzung prints Koh, and a reader who has one
  // open types what is on the page.
  Eccl: {
    name: 'Prediger',
    abbreviation: 'Pred',
    aliases: ['pred', 'prediger', 'kohelet', 'koh'],
  },
  Song: { name: 'Hoheslied', abbreviation: 'Hld', aliases: ['hld', 'hoheslied', 'hohelied'] },
  Isa: { name: 'Jesaja', abbreviation: 'Jes', aliases: ['jes', 'jesaja'] },
  Jer: { name: 'Jeremia', abbreviation: 'Jer', aliases: ['jer', 'jeremia'] },
  Lam: { name: 'Klagelieder', abbreviation: 'Klgl', aliases: ['klgl', 'klagelieder'] },
  // Luther's Hesekiel, with the Catholic Ezechiel and its own `Ez` beside it.
  Ezek: {
    name: 'Hesekiel',
    abbreviation: 'Hes',
    aliases: ['hes', 'hesekiel', 'ezechiel', 'ez'],
  },
  Dan: { name: 'Daniel', abbreviation: 'Dan', aliases: ['dan', 'daniel'] },
  Hos: { name: 'Hosea', abbreviation: 'Hos', aliases: ['hos', 'hosea'] },
  Joel: { name: 'Joel', abbreviation: 'Joel', aliases: ['joel', 'jol'] },
  Amos: { name: 'Amos', abbreviation: 'Am', aliases: ['am', 'amos'] },
  Obad: { name: 'Obadja', abbreviation: 'Obd', aliases: ['obd', 'obadja'] },
  Jonah: { name: 'Jona', abbreviation: 'Jona', aliases: ['jona', 'jonas'] },
  Mic: { name: 'Micha', abbreviation: 'Mi', aliases: ['mi', 'micha'] },
  Nah: { name: 'Nahum', abbreviation: 'Nah', aliases: ['nah', 'nahum'] },
  Hab: { name: 'Habakuk', abbreviation: 'Hab', aliases: ['hab', 'habakuk'] },
  Zeph: { name: 'Zefanja', abbreviation: 'Zef', aliases: ['zef', 'zefanja', 'zephanja'] },
  Hag: { name: 'Haggai', abbreviation: 'Hag', aliases: ['hag', 'haggai'] },
  Zech: { name: 'Sacharja', abbreviation: 'Sach', aliases: ['sach', 'sacharja'] },
  Mal: { name: 'Maleachi', abbreviation: 'Mal', aliases: ['mal', 'maleachi'] },
  Matt: { name: 'Matthäus', abbreviation: 'Mt', aliases: ['mt', 'matthaus', 'matthaeus'] },
  Mark: { name: 'Markus', abbreviation: 'Mk', aliases: ['mk', 'markus'] },
  Luke: { name: 'Lukas', abbreviation: 'Lk', aliases: ['lk', 'lukas'] },
  John: { name: 'Johannes', abbreviation: 'Joh', aliases: ['joh', 'johannes'] },
  Acts: { name: 'Apostelgeschichte', abbreviation: 'Apg', aliases: ['apg', 'apostelgeschichte'] },
  Rom: { name: 'Römer', abbreviation: 'Röm', aliases: ['rom', 'roem', 'romer'] },
  '1Cor': { name: '1. Korinther', abbreviation: '1Kor', aliases: ['1kor', '1korinther'] },
  '2Cor': { name: '2. Korinther', abbreviation: '2Kor', aliases: ['2kor', '2korinther'] },
  Gal: { name: 'Galater', abbreviation: 'Gal', aliases: ['gal', 'galater'] },
  Eph: { name: 'Epheser', abbreviation: 'Eph', aliases: ['eph', 'epheser'] },
  Phil: { name: 'Philipper', abbreviation: 'Phil', aliases: ['phil', 'philipper'] },
  Col: { name: 'Kolosser', abbreviation: 'Kol', aliases: ['kol', 'kolosser'] },
  '1Thess': {
    name: '1. Thessalonicher',
    abbreviation: '1Thess',
    aliases: ['1thess', '1thessalonicher'],
  },
  '2Thess': {
    name: '2. Thessalonicher',
    abbreviation: '2Thess',
    aliases: ['2thess', '2thessalonicher'],
  },
  '1Tim': { name: '1. Timotheus', abbreviation: '1Tim', aliases: ['1tim', '1timotheus'] },
  '2Tim': { name: '2. Timotheus', abbreviation: '2Tim', aliases: ['2tim', '2timotheus'] },
  Titus: { name: 'Titus', abbreviation: 'Tit', aliases: ['tit', 'titus'] },
  Phlm: { name: 'Philemon', abbreviation: 'Phlm', aliases: ['phlm', 'philemon'] },
  Heb: { name: 'Hebräer', abbreviation: 'Hebr', aliases: ['hebr', 'hebraer', 'hebraeer'] },
  Jas: { name: 'Jakobus', abbreviation: 'Jak', aliases: ['jak', 'jakobus'] },
  '1Pet': { name: '1. Petrus', abbreviation: '1Petr', aliases: ['1petr', '1petrus'] },
  '2Pet': { name: '2. Petrus', abbreviation: '2Petr', aliases: ['2petr', '2petrus'] },
  '1John': { name: '1. Johannes', abbreviation: '1Joh', aliases: ['1joh', '1johannes'] },
  '2John': { name: '2. Johannes', abbreviation: '2Joh', aliases: ['2joh', '2johannes'] },
  '3John': { name: '3. Johannes', abbreviation: '3Joh', aliases: ['3joh', '3johannes'] },
  Jude: { name: 'Judas', abbreviation: 'Jud', aliases: ['jud', 'judas'] },
  Rev: { name: 'Offenbarung', abbreviation: 'Offb', aliases: ['offb', 'offenbarung', 'apk'] },
};
