// Word lists and passages used by every mode.

const COMMON = `the be of and a to in he have it that for they with as not on she at by this we you do but from
or which one would all will there say who make when can more if no man out other so what time up go about than
into could state only new year some take come these know see use get like then first any work now may such give
over think most even find day also after way many must look before great back through long where much should well
people down own just because good each those feel seem how high too place little world very still hand old life
tell write become here show house both between need mean call under last right move thing school never same another
begin while number part turn real leave might want point form off child few small since against ask late home
interest large person end open public follow during present without again hold around possible head consider word
program problem however lead system set order eye plan run keep face fact group play stand increase early course
change help line city put close case force meet once water upon build hear light live every country bring center
let side try provide continue name certain power pay result question study woman member until far night always
service away report something company week toward start social room figure nature though young less enough almost
read include nothing yet better big boy cost business value second why clear expect family complete act sense mind
experience art next near direct car law industry important girl several matter usual rather often kind among white
reason action return foot care simple within love human along appear doctor believe speak active student month
drive concern best door hope example inform body ever least understand reach effect different idea whole control
condition field pass fall note special talk today measure walk teach low hour type carry rate remain full street
easy although record sit level local sure receive thus moment spirit train perhaps music grow free cause serve age
book board recent sound office cut step class true history position above strong friend add deal support party
whether either land material happen death agree arm mother across quite anything town past view answer break half
fire lose money stop already effort wait able learn voice air together shall cover common subject draw short treat
limit road letter color behind produce send term total rise century success minute remember purpose test fight
watch south ago stage father table rest bear entire market prepare explain offer plant charge ground west picture
hard front lie modern dark surface rule dance peace observe future wall farm claim firm further amount top outside
piece beauty trade fear demand wonder list accept judge paint mile soon allow heart slow island drink story stay
paper space apply decide share desire spend sign visit supply doubt wish contain feed raise describe ready horse
son exist north suggest food deep wide alone happy unit respect drop fill cold sudden basic fine trouble mark single
press heavy attempt origin everything black red bad earth else die remark equal east event smile river improve game
detail sort reduce club buy wear inside win ride realize sale choose park square price window beyond strike
instead practice catch likely permit serious floor spring lot stock hair science pattern quick influence machine
compare blue fair indeed imagine surprise average official difficult sing hit tree race touch throw quality pull
chance prove settle growth date heat save count main pick size cool summer hall slight enter season`;

// Extra words so every letter (and the home, top and bottom rows) gets fair practice.
const COVERAGE = `quiet quick quite queen quote quest quill squad square equip liquid unique frozen zone zero lazy dozen prize
puzzle maze jazz zip zest zebra breeze blaze cozy fizz buzz seize amaze gaze hazel oxen box fox tax mix fix six next
exact extra expert exit oxygen relax index jolly joke join jump jungle junior jury jacket jewel object major enjoy
kettle knock knee kick kitten knife bake cake kept milk mocha latte espresso roast brew bean cup crema aroma grind
mug barista filter pour steam sugar cocoa cream foam carafe decaf ribbon carriage platen typebar ink margin bell
vivid velvet valve vapor voyage vintage vanilla ask add all fall hall glad flask flash dash lad sad dad had lag flag
salad alas jag glass gash lash hash half shall fads gall jags slag dahl hag kale wry type pretty power write tower
rope poet route pier peer wire trip tire ripe your tree typewriter pottery equity query outer quote porter trio
can man van band hand land sand cash back snack black calm clam ham jam small mall bland scan nab cab lamb
balm clamp vamp blank flank`;

const dedupe = (text) => [...new Set(text.split(/\s+/).filter(Boolean))];

export const WORDS = dedupe(`${COMMON} ${COVERAGE}`);

// Short, public-domain passages for "quote" mode.
export const QUOTES = [
  { text: 'I have measured out my life with coffee spoons.', source: 'T. S. Eliot' },
  { text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.', source: 'Charles Dickens' },
  { text: 'All happy families are alike; each unhappy family is unhappy in its own way.', source: 'Leo Tolstoy' },
  { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', source: 'Jane Austen' },
  { text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, I thought I would sail about a little and see the watery part of the world.', source: 'Herman Melville' },
  { text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.', source: 'Lewis Carroll' },
  { text: 'Mrs. Dalloway said she would buy the flowers herself.', source: 'Virginia Woolf' },
  { text: 'A woman must have money and a room of her own if she is to write fiction.', source: 'Virginia Woolf' },
  { text: 'Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.', source: 'Charles Dickens' },
  { text: 'Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore.', source: 'Edgar Allan Poe' },
  { text: 'Two roads diverged in a yellow wood, and sorry I could not travel both and be one traveler, long I stood.', source: 'Robert Frost' },
  { text: 'Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all.', source: 'Emily Dickinson' },
  { text: 'So we beat on, boats against the current, borne back ceaselessly into the past.', source: 'F. Scott Fitzgerald' },
  { text: 'In my younger and more vulnerable years my father gave me some advice that I have been turning over in my mind ever since.', source: 'F. Scott Fitzgerald' },
  { text: 'Tomorrow, and tomorrow, and tomorrow, creeps in this petty pace from day to day, to the last syllable of recorded time.', source: 'William Shakespeare' },
  { text: 'All the world is a stage, and all the men and women merely players; they have their exits and their entrances.', source: 'William Shakespeare' },
  { text: 'It is a far, far better thing that I do, than I have ever done; it is a far, far better rest that I go to than I have ever known.', source: 'Charles Dickens' },
  { text: 'The quick brown fox jumps over the lazy dog, while five boxing wizards jump quickly.', source: 'A typist’s pangram' },
  { text: 'Pack my box with five dozen liquor jugs, then brew a very strong pot of coffee.', source: 'A typist’s pangram' },
];
