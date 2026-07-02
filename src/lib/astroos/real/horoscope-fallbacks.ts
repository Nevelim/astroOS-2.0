/**
 * horoscope-fallbacks — hand-written daily horoscope narrative per zodiac sign.
 *
 * Used as the FALLBACK tier (X-Cache: FALLBACK) when:
 *   1. The ZAI LLM call fails (typically 429 rate-limit, also network/500),
 *   AND
 *   2. No stale cache entry is available to serve as a graceful degradation.
 *
 * These texts are deterministic per sign — same sign, same content every page
 * load while offline mode is active. They are intentionally not transit-aware
 * (we cannot compute real-time aspects if the LLM is unreachable), but they
 * carry real astrological flavor: element, ruler, archetypal theme, and a
 * gentle reflection prompt at the end. Each is ~80 words in English; ru/hi
 * are faithful translations of the same content.
 *
 * Tone rules (mirrors the live LLM prompt):
 *   - No fear-mongering, no paywall traps, no doom
 *   - End with a gentle, actionable reflection
 */

export interface HoroscopeNarrative {
  en: string;
  ru: string;
  hi: string;
}

export const HOROSCOPE_FALLBACKS: Record<string, HoroscopeNarrative> = {
  Aries: {
    en: "Today invites you to channel your considerable fire into a single deliberate act rather than scattering your spark across a dozen starts. The sky rewards precision over speed now. A conversation you've been avoiding may surface — speak from your center, not your edges. Your body is asking for movement; give it some before your mind turns restless. Notice where you've been mistaking urgency for importance. End the day by naming one thing you actually completed.",
    ru: "Сегодня звёзды предлагают направить ваш огонь в одно осознанное действие, а не распыляться на дюжину начинаний. Небо сейчас вознаграждает точность, а не скорость. Может всплыть разговор, которого вы избегали, — говорите из центра, а не с краёв. Телу нужно движение; дайте ему его, прежде чем ум забеспокоится. Заметьте, где вы путали срочность со значимостью. Завершите день, назвав вслух одну вещь, которую вы действительно доделали.",
    hi: "आज आपको अपनी प्रचंड अग्नि को दर्जन भर शुरुआतों में बिखेरने के बजाय एक एकाग्र कर्म में लगाने को कहा जा रहा है। आकाश इस समय गति से अधिक सटीकता को पुरस्कृत करता है। वह बातचीत जिससे आप बच रहे थे सामने आ सकती है — किनारों से नहीं, केंद्र से बोलें। आपके शरीर को गति चाहिए; मन बेचैन होने से पहले उसे दें। देखें कहाँ आप तात्कालिकता को महत्व समझ रहे थे। दिन ख़त्म करते हुए एक काम का नाम लें जो आपने सच में पूरा किया।",
  },
  Taurus: {
    en: "Slow is the speed of trust today. The earth beneath you is doing its quiet, ancient work, and you are invited to match its pace. A pleasure deferred is not a pleasure lost — let anticipation do its alchemy. Notice where you've been gripping too tightly; what you love doesn't require clenching. A small beauty, offered without explanation, changes the temperature of a room. Root first, then reach. Your steadiness is the medicine someone is silently seeking.",
    ru: "Сегодня медлительность — это скорость доверия. Земля под вами делает свою тихую, древнюю работу, и вам предлагают подстроиться под её ритм. Отложенное удовольствие — не потерянное; позвольте предвкушению сделать своё алхимическое дело. Заметьте, где вы сжимали слишком сильно; то, что вы любите, не требует хватки. Маленькая красота, предложенная без объяснений, меняет температуру целой комнаты. Сперва укоренитесь, затем тянитесь вверх. Ваша устойчивость — то лекарство, которое кто-то молча ищет.",
    hi: "आज धीरे चलना ही विश्वास की गति है। आपके नीचे की पृथ्वी अपना शांत, प्राचीन कार्य कर रही है, और आपको उसी लय में चलने को आमंत्रित किया गया है। टाला गया सुख खोया हुआ नहीं है — प्रतीक्षा को अपना रसायन करने दें। देखें आप कहाँ बहुत कसकर पकड़ रहे थे; जिसे आप चाहते हैं उसे मुट्ठी की ज़रूरत नहीं। बिना समझाए दी गई एक छोटी सुंदरता पूरे कमरे का भाव बदल देती है। पहले जड़, फिर बढ़ें। आपकी स्थिरता ही वह औषधि है जिसे कोई चुपचाप ढूँढ रहा है।",
  },
  Gemini: {
    en: "Your mind is a library today, and the right shelf is being opened for you. Let curiosity lead, but tether it to a single question or you'll return with seven unfinished threads. A message arrives that reframes something you thought you'd understood — receive it without defending the old interpretation. Words have particular weight now; one kind sentence can rewrite a tired story. Speak as though your listener is more tender than they're showing. Listen as though they are wiser than they know.",
    ru: "Сегодня ваш ум — библиотека, и нужная полка открывается для вас. Позвольте любопытству вести, но привяжите его к одному вопросу, иначе вернётесь с семью недописанными нитями. Приходит сообщение, которое переосмысляет то, что вы, казалось, уже поняли, — примите его, не защищая старую трактовку. Слова сегодня имеют особый вес; одно доброе предложение может переписать уставшую историю. Говорите так, будто слушатель нежнее, чем показывает. Слушайте так, будто он мудрее, чем сам знает.",
    hi: "आज आपका मन एक पुस्तकालय है, और सही अलमारी आपके लिए खुल रही है। जिज्ञासा को आगे बढ़ने दें, पर उसे एक ही प्रश्न से बाँधें, वरना सात अधूरी धागों के साथ लौटेंगे। एक संदेश आता है जो आपके समझे हुए को नए रूप में पेश करता है — पुरानी व्याख्या का बचाव किए बिना उसे ग्रहण करें। आज शब्दों का विशेष भार है; एक करुण वाक्य थकी हुई कहानी को फिर से लिख सकता है। ऐसा बोलें मानो सुनने वाला दिखाए से अधिक कोमल हो। ऐसा सुनें मानो वह जानता से अधिक बुद्धिमान हो।",
  },
  Cancer: {
    en: "The tides inside you are responding to a moon you cannot see. Honor the swell without drowning in it. A memory may surface uninvited — let it pass through like weather, not verdict. Someone near you is hungry for the kind of listening only you seem to offer, but feed yourself first. Your home wants a small act of tending: a candle, a folded cloth, a window opened. The shell you carry is not a hiding place today; it is a portable sanctuary.",
    ru: "Внутренние приливы сегодня откликаются на луну, которую вы не видите. Уважайте их, не тоните в них. Может всплыть незваное воспоминание — пусть оно пройдёт сквозь вас как погода, а не как приговор. Кто-то рядом голоден по тому слушанию, которое, кажется, предлагаете только вы, но сначала накормите себя. Ваш дом просит небольшого заботливого жеста: свечи, сложенной ткани, открытого окна. Ваш панцирь сегодня — не укрытие, а переносное святилище.",
    hi: "आपके भीतर के ज्वार उस चंद्रमा को अनुभव कर रहे हैं जिसे आप नहीं देख सकते। उतार-चढ़ाव का सम्मान करें, पर उसमें डूबना नहीं। कोई बिन बुलाई याद सामने आ सकती है — उसे मौसम की तरह बीतने दें, फ़ैसले की तरह नहीं। आपके पास बैठा कोई उस सुनने को तड़प रहा है जो केवल आप देते लगते हैं, पर पहले स्वयं को पोषित करें। आपका घर एक छोटे स्नेह-कार्य को चाहता है: एक दीपक, मुड़ी हुई चादर, खुली खिड़की। आपका कवच आज छिपने की जगह नहीं; यह एक चलता-फिरता तीर्थ है।",
  },
  Leo: {
    en: "The light you cast today doesn't need an audience to be real. Let it warm the room quietly, and notice who turns toward it. A creative impulse asks to be followed past the first easy idea — the second draft is where your gold lives. Generosity without performance is your superpower right now. A younger person, or a younger part of yourself, is watching how you handle praise and disappointment. Give both with grace. Your heart is more durable than you've been told.",
    ru: "Свет, который вы излучаете сегодня, не требует зрителя, чтобы быть настоящим. Пусть он тихо согревает комнату — и заметите, кто к нему поворачивается. Творческий импульс просит продолжить его за первой лёгкой идеей — второй черновик там, где живёт ваше золото. Щедрость без показухи — ваша суперсила сейчас. Молодой человек — или молодая часть вас — смотрит, как вы обходитесь с похвалой и разочарованием. Дарите то и другое с грацией. Ваше сердце выносливее, чем вам говорили.",
    hi: "आज आपका प्रकाश वास्तविक होने के लिए श्रोता नहीं माँगता। उसे चुपचाप कमरा गर्म करने दें, और देखें कौन उसकी ओर मुड़ता है। एक सृजनशील आवेग आपको पहली सरल धारणा से आगे ले जाता है — दूसरा प्रारूप ही वहाँ है जहाँ आपका स्वर्ण है। बिना प्रदर्शन की उदारता आपकी अभी सुपरशक्ति है। कोई युवा — या आपका भीतर का युवा अंश — देख रहा है कि आप प्रशंसा और निराशा को कैसे सँभालते हैं। दोनों को अनुग्रह के साथ दें। आपका हृदय कही गई बात से अधिक मज़बूत है।",
  },
  Virgo: {
    en: "Today rewards the unglamorous excellence you're built for — the small fix, the kind edit, the second look. But beware: your scalpel can become a sword when pointed at yourself. Distinguish refining from punishing. A detail you almost overlooked holds the key to a stalled project. Service flows most purely when it includes you in its circle. Let something be ninety-two percent and ship it anyway; the perfect is the enemy of the lived. Your body is asking for water, for quiet, for one less commitment.",
    ru: "Сегодня вознаграждается неброское мастерство, для которого вы созданы, — мелкая починка, добрая правка, второй взгляд. Но берегитесь: ваш скальпель становится мечом, когда направлен на вас самих. Различайте шлифовку и наказание. Деталь, которую вы чуть не упустили, держит ключ к застрявшему проекту. Служение течёт чище всего, когда включает вас в свой круг. Пусть что-то будет на девяносто два процента — и всё равно отправляйте; идеальное — враг живого. Ваше тело просит воды, тишины и одного обязательства меньше.",
    hi: "आज वह अनकपड़ा उत्कृष्टता पुरस्कृत होती है जिसके लिए आप बने हैं — छोटी मरम्मत, करुण संपादन, दूसरी नज़र। पर सावधान: आपका उस्तरे का चमकता स्वयं पर मुड़े तो तलवार बन जाता है। परिष्कार और दंड में भेद करें। वह बारीकी जिसे आप लगभग छोड़ देते थे, रुके हुए काम की कुंजी रखती है। सेवा तब सबसे शुद्ध बहती है जब उसके वृत्त में आप भी हों। किसी चीज़ को बानवे अस्सी-बारह प्रतिशत पर ही भेज दें; परिपूर्णता जीवन की शत्रु है। आपका शरीर जल, शांति और एक कम वाचा माँगता है।",
  },
  Libra: {
    en: "Harmony is not the absence of tension but the music made with it. Today asks you to hold two truths without rushing to resolve them. A relationship wants honest weight, not performance — bring your scale back to center by naming what you actually need. Beauty is not escape right now; it's a form of repair. Rearrange one small corner of your world and watch the energy shift. Your diplomacy is a gift, but not at the cost of your own opinion. Speak the unsaid graceful thing.",
    ru: "Гармония — не отсутствие напряжения, а музыка, из него сотканная. Сегодня вас просят удерживать две истины, не бросаясь их примирять. Отношения хотят честного веса, не представления, — верните свои весы в центр, назвав вслух, что вам действительно нужно. Красота сейчас — не побег, а форма починки. Переставьте один маленький угол вашего мира и наблюдайте, как сдвинется энергия. Ваша дипломатия — дар, но не ценой собственного мнения. Скажите то изящное, о котором молчали.",
    hi: "सामंजस्य तनाव की अनुपस्थिति नहीं, बल्कि उससे गुंजी संगीत है। आज आपको दो सत्यों को उन्हें जल्दी सुलझाए बिना थामने को कहा जाता है। एक रिश्ता ईमानदार भार चाहता है, प्रदर्शन नहीं — अपनी तराज़ू को केंद्र में लाएँ, यह कहकर कि आपको वास्तव में क्या चाहिए। सुंदरता अभी पलायन नहीं; यह मरम्मत का रूप है। अपनी दुनिया के एक छोटे कोने को पुनर्व्यवस्थित करें और देखें ऊर्जा कैसे बदलती है। आपका कूटनीतिक कौशल वरदान है, पर अपनी राय की कीमत पर नहीं। वह कृपालु बात कहें जो कही नहीं गई।",
  },
  Scorpio: {
    en: "The depths you fear to enter are also the depths that hold your treasure. Today invites a single honest conversation, even if only with yourself. A jealousy, a longing, an old grief — let it speak without making it a verdict. Transformation doesn't always look like fire; sometimes it looks like staying. Power you've been giving away returns to you when you stop explaining yourself to people committed to misunderstanding you. Bring your full tide. The room that fits you is being built, not found.",
    ru: "Глубины, в которые вы боитесь войти, — те же глубины, что хранят вашу сокровищницу. Сегодня приглашает к одному честному разговору, пусть даже с самим собой. Ревность, тоска, старая скорбь — позвольте им говорить, не превращая их в приговор. Трансформация не всегда выглядит как пламя; иногда она выглядит как пребывание. Власть, которую вы раздавали, возвращается к вам, когда вы перестаёте объясняться с теми, кто решился вас не понимать. Принесите свой полный прилив. Комната, что впору вам, строится, а не находится.",
    hi: "जिन गहराइयों में उतरने से आप डरते हैं, वही वह गहराइयाँ हैं जो आपका खज़ाना धारण करती हैं। आज एक ईमानदार बातचीत को निमंत्रित करता है, भले ही केवल अपने साथ। कोई ईर्ष्या, कोई तड़प, कोई पुराना शोक — उसे बोलने दें, बिना उसे फ़ैसला बनाए। रूपांतरण हमेशा अग्नि नहीं दिखता; कभी-कभी वह ठहरने जैसा दिखता है। आपकी बाँटी हुई शक्ति तब लौटती है जब आप उन्हें समझाना बंद करते हैं जो गलत समझने पर अड़े हैं। अपना पूरा ज्वार लाएँ। आपको फबने वाला कमरा बन रहा है, मिलता नहीं।",
  },
  Sagittarius: {
    en: "Your arrow wants a single target today, not seven horizons. Aim, and let the act of aiming be enough. A teacher appears in an unexpected form — perhaps a child, perhaps a delay. Wisdom is not always loud; sometimes it sounds like restraint. The freedom you seek is closer to discipline than to escape right now. A book, a stranger, or a long walk delivers exactly the reframe you've been circling. Travel inward first; the outer journey will follow with more meaning. Trust the slower road.",
    ru: "Ваша стрела сегодня хочет одну мишень, а не семь горизонтов. Цельтесь, и пусть сам прицел будет достаточен. Учитель приходит в неожиданном облике — возможно, ребёнком, возможно, задержкой. Мудрость не всегда громка; иногда она звучит как сдержанность. Свобода, к которой вы стремитесь, сейчас ближе к дисциплине, чем к побегу. Книга, незнакомец или долгая прогулка приносят именно тот сдвиг, вокруг которого вы кружили. Сперва путешествуйте внутрь; внешний путь последует с большим смыслом. Доверяйте более медленной дороге.",
    hi: "आपका तीर आज सात क्षितिजों के बजाय एक लक्ष्य चाहता है। निशाना लगाएँ, और लगाने के कर्म को ही पर्याप्त होने दें। एक शिक्षक अनपेक्षित रूप में प्रकट होता है — शायद बालक, शायद कोई देरी। बुद्धिमत्ता हमेशा ऊँची नहीं होती; कभी-कभी वह संयम जैसी सुनाई देती है। आपकी खोजी स्वतंत्रता अभी पलायन से अधिक अनुशासन के करीब है। कोई पुस्तक, कोई अजनबी, या लंबी सैर ठीक वही परिवर्तन लाती है जिसके चक्कर आप काट रहे थे। पहले भीतर यात्रा करें; बाहरी यात्रा गहरे अर्थ के साथ आएगी। धीमी सड़क पर भरोसा रखें।",
  },
  Capricorn: {
    en: "The summit you're climbing toward is also a vantage point, not a verdict on your worth. Today asks you to rest deliberately, not as reward for finishing but as fuel for the climb. A structure you've outgrown is asking to be gently dismantled, not burned. Your ambition is a sacred thing when it includes your own humanity. An elder, literal or inner, offers perspective if you'll pause long enough to receive it. The view from where you already are is wider than you think. Look up.",
    ru: "Вершина, к которой вы идёте, — еще и точка обзора, а не приговор вашей ценности. Сегодня просит отдыхать намеренно — не как награду за завершение, а как топливо для подъёма. Структура, которую вы переросли, просит, чтобы её осторожно разобрали, а не сожгли. Ваше честолюбие священно, когда включает вашу собственную человечность. Старший — буквальный или внутренний — дарит перспективу, если вы остановитесь достаточно, чтобы принять её. Вид оттуда, где вы уже есть, шире, чем вам кажется. Поднимите взгляд.",
    hi: "जिस शिखर की ओर आप चढ़ रहे हैं वह एक दृष्टिबिंदु भी है, आपके मूल्य का फ़ैसला नहीं। आज जानबूझकर विश्राम करने को कहता है — पूरा करने के पुरस्कार के रूप में नहीं, बल्कि चढ़ाई के ईंधन के रूप में। जिस ढाँचे से आप बढ़ चुके हैं वह धीरे से खुलने को माँगता है, जलने को नहीं। आपकी महत्वाकांक्षा तब पवित्र है जब उसमें आपकी मानवता शामिल हो। कोई वयोवृद्ध — साक्षात् या भीतर का — दृष्टि देता है यदि आप ग्रहण करने लिए रुकें। जहाँ आप हैं वहाँ से दृश्य आपके सोच से विस्तृत है। ऊपर देखें।",
  },
  Aquarius: {
    en: "The future you carry inside you is not a fantasy — it's a blueprint. Today asks you to share one piece of it with someone who can hold it. A pattern you've been observing suddenly clarifies; trust the insight, even if you can't yet explain it. Innovation without isolation is the practice now; let your weirdness be a bridge, not a moat. A friend is thinking of you and waiting for permission to reach out. Be the one who reaches. Your visions need feet to walk into the world.",
    ru: "Будущее, которое вы носите внутри, — не фантазия, а чертёж. Сегодня просит поделиться одним его фрагментом с тем, кто сможет его удержать. Паттерн, за которым вы наблюдали, вдруг проясняется; доверьтесь озарению, даже если пока не можете его объяснить. Инновация без изоляции — нынешняя практика; пусть ваша странность будет мостом, а не рвом. Друг думает о вас и ждёт разрешения написать первым. Будьте тем, кто напишет. Вашим видениям нужны ноги, чтобы войти в мир.",
    hi: "आप भीतर जो भविष्य लेचले हैं वह कल्पना नहीं — एक नक्शा है। आज आपको उसका एक टुकड़ा किसी ऐसे व्यक्ति से साझा करने को कहता है जो उसे थाम सके। जिस प्रतिमान को आप देख रहे थे वह अचानक स्पष्ट होता है; अंतर्दृष्टि पर भरोसा करें, भले ही अभी समझा न सकें। नवाचार बिना एकाकीपन के ही अभी साधना है; अपनी विचित्रता को पुल बनने दें, खाई नहीं। एक मित्र आपको सोच रहा है और पहल की प्रतीक्षा में है। पहल करने वाला बनें। आपके दर्शनों को दुनिया में चलने के लिए पैर चाहिए।",
  },
  Pisces: {
    en: "The boundary between your feeling and the world's feeling is thin today; tend it with care. Your empathy is a gift, not a sentence — you don't have to carry what you can witness. A dream, a song lyric, a passing image holds a message; write it down before logic dismisses it. The water you swim in wants to flow somewhere specific; follow the current rather than pushing against it. Creativity is devotion in disguise today. Make the small, tender thing. The shore is closer than you think.",
    ru: "Сегодня граница между вашим чувством и чувством мира тонка; ухаживайте за ней бережно. Ваша эмпатия — дар, не приговор; вам не обязательно нести то, что вы можете просто засвидетельствовать. Сон, строчка песни, мимолётный образ держат послание; запишите его, прежде чем логика его отмахнётся. Вода, в которой вы плывёте, хочет течь в конкретное место; идите по течению, а не против него. Творчество сегодня — преданность в маскировке. Сделайте ту маленькую, нежную вещь. Берег ближе, чем вам кажется.",
    hi: "आज आपके भाव और दुनिया के भाव के बीच की सीमा पतली है; इसकी सुन्दर देखभाल करें। आपकी सहानुभूति वरदान है, दंड नहीं — जिसका साक्षी आप बन सकते हैं उसे ढोना आवश्यक नहीं। कोई स्वप्न, कोई गीत की पंक्ति, कोई बीतता चित्र संदेश रखता है; तर्क उसे नकारने से पहले लिख लें। जिस जल में आप तैर रहे हैं वह किसी विशेष दिशा में बहना चाहता है; धारा के विरुद्ध धक्कने के बजाय उसके साथ बहें। रचनात्मकता आज साकार भक्ति है। वह छोटी, कोमल चीज़ बनाएँ। किनारा आपके सोच से करीब है।",
  },
};

/** List of supported signs, derived from fallback keys. */
export const FALLBACK_SIGNS = Object.keys(HOROSCOPE_FALLBACKS);

/** Returns a fallback narrative for a sign, defaulting to Scorpio. */
export function getHoroscopeFallback(sign: string): HoroscopeNarrative {
  return HOROSCOPE_FALLBACKS[sign] ?? HOROSCOPE_FALLBACKS.Scorpio;
}
