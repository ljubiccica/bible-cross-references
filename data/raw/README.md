# Raw data

Unmodified copies of the upstream files the app is built from. The small ones are committed so
that the site can be rebuilt even if an upstream URL disappears; the KJV archive is not, because
4.4 MB of it is more than a repository should carry for one translation, so `npm run data:build`
downloads it on demand instead. Either way `../sources.json` pins the file by SHA-256 and the build
refuses anything that does not match it, before turning them into the datasets in `public/data/`.

| File                                                        | Source                                                                                                                                                               | License                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `bsb.txt`                                                   | [Berean Standard Bible](https://berean.bible/), from <https://bereanbible.com/bsb.txt>, retrieved 2026-09-25                                                         | Public domain ("dedicated to the public domain", per the file) |
| `openbible-cross-references.zip`                            | [OpenBible.info cross-references](https://www.openbible.info/labs/cross-references/), from <https://a.openbible.info/data/cross-references.zip>, snapshot 2026-09-21 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)      |
| `eng-kjv2006_vpl.zip` (not committed; fetched by the build) | [King James Version](https://ebible.org/Scriptures/details.php?id=eng-kjv2006), from <https://ebible.org/Scriptures/eng-kjv2006_vpl.zip>, retrieved 2026-10-15       | Public domain (in the United Kingdom: Crown copyright)         |
| `stepbible-*.txt` (not committed; fetched by the build)     | [STEPBible](https://github.com/STEPBible/STEPBible-Data) tagged Hebrew (TAHOT) and Greek (TAGNT) with the TBESH and TBESG lexicons, retrieved 2026-10-16             | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)      |

Attribution for the scripture texts: _Berean Standard Bible (BSB), dedicated to the public
domain._ and _King James Version (Authorized Version), the 1769 text; public domain in the United
States and most of the world, Crown copyright in the United Kingdom._

Attribution for the original-language words: _STEP Bible (<https://www.STEPBible.org>), based on
work at Tyndale House, Cambridge, licensed under CC BY 4.0
(<https://creativecommons.org/licenses/by/4.0/>)._ Modified: reduced to the dictionary form of each
word used in each verse, keyed to KJV verse numbering, with psalm superscriptions (which that
numbering has no slot for) left out. The 96 MB of tagged text is not committed
here: STEPBible asks that it be fetched from them rather than passed on second-hand, which is also
what `npm run data:build` does, against the pins in `../sources.json`.

Attribution for the cross-references: _Cross-reference data: OpenBible.info
(<https://www.openbible.info/labs/cross-references/>), licensed under CC BY 4.0
(<https://creativecommons.org/licenses/by/4.0/>)._ The files here are unmodified; the datasets built
from them are re-indexed to KJV verse numbering.

The MIT license of this repository's code does not apply to these files.
