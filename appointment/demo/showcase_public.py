"""Public-site copy for the showcase businesses that the seeder publishes.

Templates render only what a release contains, so everything a showcase site
shows lives here as owner content: Amharic copy and photos with alt text. The
Amharic table is keyed by the English source text. Anything without an entry
publishes in English only, and the page falls back to English for that field.
"""

SUPPORT = "/assets/appointment/brand-experience/support"

# Support photos per business, with alt text written for what each photo shows.
SCENES = {
    "selam": [
        ("A woman in a low lunge on a mat in a sunny studio.", "አንዲት ሴት ፀሐያማ በሆነ ስቱዲዮ ውስጥ ምንጣፍ ላይ ዝቅ ብላ ትለማመዳለች።"),
        ("An empty movement studio with mats, cushions and tall windows over the city.", "ምንጣፎችና ትራሶች ያሉበት፣ ወደ ከተማው የሚመለከቱ ረጃጅም መስኮቶች ያሉት ባዶ የእንቅስቃሴ ስቱዲዮ።"),
        ("Three people sit on a rug and talk over tea and a notebook.", "ሦስት ሰዎች ምንጣፍ ላይ ተቀምጠው በሻይና በማስታወሻ ደብተር ዙሪያ ይወያያሉ።"),
    ],
    "meron": [
        ("A tailor cuts dark cloth on a long table in the atelier.", "አንድ ልብስ ሰፊ በአቴሊየሩ ረጅም ጠረጴዛ ላይ ጥቁር ጨርቅ ይቆርጣል።"),
        ("Hand stitching along a chalk line on dark wool.", "በጥቁር ሱፍ ላይ በኖራ መስመር ተከትሎ በእጅ የሚሰፋ ስፌት።"),
        ("The atelier with a cutting table, jackets on a rail and plants by the window.", "የመቁረጫ ጠረጴዛ፣ በመስቀያ ላይ ያሉ ጃኬቶችና በመስኮቱ አጠገብ ተክሎች ያሉበት አቴሊየር።"),
    ],
    "bloom": [
        ("A stylist parts a client's natural curls.", "አንዲት ፀጉር ሠሪ የደንበኛዋን የተፈጥሮ ከርል ፀጉር ትከፍላለች።"),
        ("Close view of hands twisting a section of curly hair.", "የከርል ፀጉር ክፍልን የሚጠቀልሉ እጆች በቅርበት።"),
        ("The salon floor with red styling chairs, mirrors and plants.", "ቀይ የፀጉር ወንበሮች፣ መስተዋቶችና ተክሎች ያሉበት የሳሎኑ ክፍል።"),
    ],
    "tena": [
        ("A clinician takes notes while a patient talks.", "አንዲት ባለሙያ ታካሚዋ ስትናገር ማስታወሻ ትይዛለች።"),
        ("Three members of the clinic team stand together.", "ሦስት የክሊኒኩ ቡድን አባላት በአንድ ላይ ቆመዋል።"),
        ("The clinic reception with a wooden desk, chairs and plants.", "የእንጨት ጠረጴዛ፣ ወንበሮችና ተክሎች ያሉበት የክሊኒኩ መቀበያ።"),
    ],
    "abugida": [
        ("A coach and a learner talk across a table of books.", "አንድ አሠልጣኝና አንዲት ተማሪ በመጽሐፍ በተሞላ ጠረጴዛ ዙሪያ ይነጋገራሉ።"),
        ("Fidel cards and an open notebook on a wooden table.", "የፊደል ካርዶችና የተከፈተ ደብተር በእንጨት ጠረጴዛ ላይ።"),
        ("A learning room with a long table, bookshelves and a view of the hills.", "ረጅም ጠረጴዛ፣ የመጽሐፍ መደርደሪያዎችና ወደ ኮረብታዎቹ የሚመለከት መስኮት ያለው የመማሪያ ክፍል።"),
    ],
}

# Which scene illustrates each service (by position), the about section and each location.
SCENE_USE = {
    "selam": {"services": [3, 1], "about": 2, "locations": [2]},
    "meron": {"services": [1, 2], "about": 3, "locations": [3]},
    "bloom": {"services": [2, 1, 3], "about": 1, "locations": [3, 3]},
    "tena": {"services": [1, 1, 1], "about": 2, "locations": [3, 3, 3]},
    "abugida": {"services": [1, 2], "about": 2, "locations": [3, 3]},
}

DAY_AM = {
    "Monday": "ሰኞ", "Tuesday": "ማክሰኞ", "Wednesday": "ረቡዕ", "Thursday": "ሐሙስ",
    "Friday": "ዓርብ", "Saturday": "ቅዳሜ", "Sunday": "እሑድ",
}

AM = {
    # Shared structure
    "Choose an appointment": "ቀጠሮ ይምረጡ",
    "Start with the service that best matches the question, goal or visit you have in mind.": "ካለዎት ጥያቄ፣ ግብ ወይም ጉብኝት ጋር በሚስማማው አገልግሎት ይጀምሩ።",
    "Share what you need": "የሚፈልጉትን ያጋሩ",
    "Use the appointment notes and the first conversation to give your provider useful context.": "በቀጠሮው ማስታወሻና በመጀመሪያው ውይይት ለባለሙያዎ ጠቃሚ መረጃ ይስጡ።",
    "Leave with a clear next step": "ግልጽ የሆነ ቀጣይ እርምጃ ይዘው ይውጡ",
    "The visit ends with a practical next step to carry forward.": "ጉብኝቱ ይዘውት በሚሄዱት ተግባራዊ ቀጣይ እርምጃ ይጠናቀቃል።",
    "Meet the people who hold the appointment with you.": "ቀጠሮውን ከእርስዎ ጋር የሚያካሂዱትን ሰዎች ይተዋወቁ።",
    "How a visit works": "ጉብኝት እንዴት እንደሚካሄድ",
    "What happens from booking to the end of your visit.": "ከቀጠሮ ማስያዝ እስከ ጉብኝትዎ መጨረሻ የሚሆነው።",
    "Small details that make the visit easier": "ጉብኝቱን ቀላል የሚያደርጉ ትናንሽ ዝርዝሮች",
    "Reviews": "አስተያየቶች",
    "Fictional feedback for this demonstration site.": "ለዚህ ማሳያ ድረ-ገጽ የተዘጋጀ ምናባዊ አስተያየት።",
    "Fictional demo client": "ምናባዊ የማሳያ ደንበኛ",
    "At a glance": "በአጭሩ",
    "Appointment style": "የቀጠሮ ዓይነት",
    "One-to-one": "አንድ ለአንድ",
    "A focused visit with a named provider.": "ከተወሰነ ባለሙያ ጋር ትኩረት የተሰጠው ጉብኝት።",
    "Service menu": "የአገልግሎት ዝርዝር",
    "A small menu that is easier to compare.": "ለማነጻጸር ቀላል የሆነ አጭር ዝርዝር።",
    "Addis locations": "በአዲስ አበባ ያሉ ቦታዎች",
    "Arrival details are shown before you book.": "ቀጠሮ ከመያዝዎ በፊት የአመጣጥ መረጃ ይታያል።",
    "Know where to go and what to expect when you arrive.": "የት እንደሚሄዱና ሲደርሱ ምን እንደሚጠብቅዎት ይወቁ።",
    "Call to ask a question": "ጥያቄ ለመጠየቅ ይደውሉ",
    "Book an appointment": "ቀጠሮ ይያዙ",
    "Contact the team": "ቡድኑን ያግኙ",
    "Choose this provider": "ይህን ባለሙያ ይምረጡ",
    "Provider profile available before booking": "ከቀጠሮ በፊት የባለሙያው መግለጫ ይገኛል",
    "Get directions": "አቅጣጫ ያግኙ",
    "All details on this demonstration site are fictional.": "በዚህ ማሳያ ድረ-ገጽ ላይ ያሉ ዝርዝሮች ሁሉ ምናባዊ ናቸው።",
    "Addis Ababa": "አዲስ አበባ",

    # Selam
    "A steadier way back into movement": "ወደ እንቅስቃሴ የሚመልስ የተረጋጋ መንገድ",
    "Quiet one-to-one movement coaching in Gerji for people building a kinder, more useful routine around work and everyday life.": "በሥራና በዕለት ተዕለት ሕይወት ዙሪያ ለስላሳና ጠቃሚ ልማድ ለሚገነቡ ሰዎች በገርጂ የሚሰጥ ጸጥ ያለ የአንድ ለአንድ የእንቅስቃሴ ስልጠና።",
    "For desk-bound professionals, returning movers and anyone who wants practical guidance without a crowded class.": "ቀኑን ሙሉ ለሚቀመጡ ባለሙያዎች፣ ወደ እንቅስቃሴ ለሚመለሱና ያለ ተጨናነቀ ክፍል ተግባራዊ መመሪያ ለሚፈልጉ ሁሉ።",
    "Selam Movement Practice grew from short, attentive sessions that fit around real working weeks. Each visit starts with listening, then turns into a small set of movements you can understand and repeat.": "ሰላም የእንቅስቃሴ ልምምድ ከእውነተኛ የሥራ ሳምንት ጋር ከሚስማሙ አጭርና ትኩረት የተሞሉ ክፍለ ጊዜዎች ተጀመረ። እያንዳንዱ ጉብኝት በማዳመጥ ይጀምራል፤ ከዚያም ሊረዱትና ሊደግሙት የሚችሉት ጥቂት እንቅስቃሴዎች ይሆናል።",
    "One practitioner, one private studio, and a deliberately small menu of sessions.": "አንድ ባለሙያ፣ አንድ የግል ስቱዲዮና ሆን ተብሎ አጭር የሆነ የክፍለ ጊዜ ዝርዝር።",
    "A quiet start": "ጸጥ ያለ ጅማሮ",
    "Begin with a conversation about your week before any movement is selected.": "ማንኛውም እንቅስቃሴ ከመመረጡ በፊት ስለ ሳምንትዎ በሚደረግ ውይይት ይጀምሩ።",
    "Useful between visits": "በጉብኝቶች መካከል ጠቃሚ",
    "Leave with a short sequence that is realistic to repeat at home or at a desk.": "በቤት ወይም በጠረጴዛዎ ላይ በቀላሉ ሊደግሙት የሚችሉትን አጭር ቅደም ተከተል ይዘው ይውጡ።",
    "Paced for you": "በእርስዎ ፍጥነት",
    "Sessions stay one-to-one, with room to pause, ask questions and adjust.": "ክፍለ ጊዜዎቹ አንድ ለአንድ ናቸው፤ ለማረፍ፣ ለመጠየቅና ለማስተካከል ጊዜ አለ።",
    "Do I need to be fit already?": "አስቀድሞ ብቁ መሆን ያስፈልገኛል?",
    "No. The first visit is designed to meet you where you are and choose an appropriate starting point.": "አያስፈልግም። የመጀመሪያው ጉብኝት ካሉበት ደረጃ ተነስቶ ተገቢውን መነሻ ለመምረጥ የተዘጋጀ ነው።",
    "What should I bring?": "ምን ይዤ ልምጣ?",
    "Comfortable clothing and a little context about what you would like to make easier.": "ምቹ ልብስና ቀላል እንዲሆንልዎ ስለሚፈልጉት ነገር ትንሽ መረጃ።",
    "How do I choose a session?": "ክፍለ ጊዜ እንዴት እመርጣለሁ?",
    "Choose Movement consultation for a first conversation or Guided mobility session if you already know you want to practise.": "ለመጀመሪያ ውይይት የእንቅስቃሴ ምክክርን፣ መለማመድ እንደሚፈልጉ ካወቁ ደግሞ የሚመራ የእንቅስቃሴ ክፍለ ጊዜን ይምረጡ።",
    "Start with a consultation": "በምክክር ይጀምሩ",
    "See the two session options": "ሁለቱን የክፍለ ጊዜ አማራጮች ይመልከቱ",
    "Make room for a useful hour": "ለጠቃሚ አንድ ሰዓት ቦታ ይስጡ",
    "Pick a session and a time that leaves your week feeling more workable.": "ሳምንትዎን ቀለል የሚያደርግ ክፍለ ጊዜና ሰዓት ይምረጡ።",
    "Find a movement time": "የእንቅስቃሴ ሰዓት ይፈልጉ",
    "Movement consultation": "የእንቅስቃሴ ምክክር",
    "Guided mobility session": "የሚመራ የእንቅስቃሴ ክፍለ ጊዜ",
    "A 45-minute conversation and movement check-in to understand your routine, goals and a comfortable place to begin.": "ልማድዎን፣ ግቦችዎንና ምቹ መነሻን ለመረዳት የሚደረግ የ45 ደቂቃ ውይይትና የእንቅስቃሴ ግምገማ።",
    "A spacious one-to-one session with simple mobility work, pacing and a short take-home sequence.": "ቀላል የእንቅስቃሴ ልምምድ፣ ፍጥነት ማስተካከልና ለቤት የሚሆን አጭር ቅደም ተከተል ያለው ሰፊ የአንድ ለአንድ ክፍለ ጊዜ።",
    "Choose a pace that fits your week": "ለሳምንትዎ የሚስማማ ፍጥነት ይምረጡ",
    "Your movement guide": "የእንቅስቃሴ መሪዎ",
    "A private Gerji studio": "በገርጂ ያለ የግል ስቱዲዮ",
    "Movement that belongs in real life": "ለእውነተኛ ሕይወት የሚሆን እንቅስቃሴ",
    "Before your first movement visit": "ከመጀመሪያው የእንቅስቃሴ ጉብኝትዎ በፊት",
    "Plan a quieter arrival": "የተረጋጋ አመጣጥ ያቅዱ",
    "Movement guide": "የእንቅስቃሴ መሪ",
    "Movement coaching": "የእንቅስቃሴ ስልጠና",
    "Mobility practice": "የእንቅስቃሴ ልምምድ",
    "The first visit gave me one small routine I could actually return to.": "የመጀመሪያው ጉብኝት በእርግጥ ልመለስበት የምችለውን አንድ ትንሽ ልማድ ሰጠኝ።",
    "Gerji private studio": "የገርጂ የግል ስቱዲዮ",
    "Gerji, off CMC Road, Blue gate, second floor, room 3, Addis Ababa": "ገርጂ፣ ከሲኤምሲ መንገድ ገባ ብሎ፣ ሰማያዊው በር፣ ሁለተኛ ፎቅ፣ ክፍል 3፣ አዲስ አበባ",
    "Use the blue gate and allow a few minutes to settle in before the session.": "በሰማያዊው በር ይግቡ፤ ከክፍለ ጊዜው በፊት ለመረጋጋት ጥቂት ደቂቃዎችን ይፍቀዱ።",

    # Meron
    "Clothes that fit the person wearing them": "ለለባሹ የሚስማማ ልብስ",
    "A Kazanchis atelier for careful fittings, thoughtful alterations and occasion pieces shaped around how you actually want to move.": "በጥንቃቄ ለሚደረግ ልኬት፣ ለታሰበበት ማስተካከያና በእርግጥ መንቀሳቀስ በሚፈልጉበት መንገድ ለሚቀረጹ የበዓል ልብሶች በካዛንቺስ ያለ አቴሊየር።",
    "For people preparing a special outfit, refining a favourite garment or looking for an attentive first fitting.": "ልዩ አለባበስ ለሚያዘጋጁ፣ የሚወዱትን ልብስ ለሚያሻሽሉ ወይም ትኩረት የተሞላ የመጀመሪያ ልኬት ለሚፈልጉ።",
    "Meron Tailoring Atelier keeps the fitting table at the centre of the process. Measurements, fabric, movement and the occasion are considered together before a needle touches the garment.": "መሮን የልብስ ስፌት አቴሊየር የልኬት ጠረጴዛውን በሂደቱ መሃል ያደርጋል። መርፌ ልብሱን ከመንካቱ በፊት ልኬት፣ ጨርቅ፣ እንቅስቃሴና ዝግጅቱ በአንድ ላይ ይታሰባሉ።",
    "A single Kazanchis fitting room, clear next steps and no promise of a finished piece before the garment is assessed.": "በካዛንቺስ አንድ የልኬት ክፍል፣ ግልጽ ቀጣይ እርምጃዎች፤ ልብሱ ሳይገመገም የተጠናቀቀ ሥራ ቃል አይገባም።",
    "A measured plan": "የተለካ ዕቅድ",
    "Leave the first fitting knowing what will change, what will stay and what happens next.": "ምን እንደሚቀየር፣ ምን እንደሚቀር እና ቀጥሎ ምን እንደሚሆን አውቀው ከመጀመሪያው ልኬት ይውጡ።",
    "Fit before finish": "ከማጠናቀቅ በፊት ልኬት",
    "Appointments make space to test comfort and movement, not only the mirror view.": "ቀጠሮዎች በመስተዋት ከሚታየው በላይ ምቾትንና እንቅስቃሴን ለመፈተሽ ጊዜ ይሰጣሉ።",
    "A human-scale atelier": "ሰዋዊ ልክ ያለው አቴሊየር",
    "One fitting table keeps the conversation direct from first measurement to final adjustment.": "አንድ የልኬት ጠረጴዛ ውይይቱን ከመጀመሪያው ልኬት እስከ መጨረሻው ማስተካከያ ቀጥተኛ ያደርገዋል።",
    "Should I bring the shoes for my outfit?": "ለአለባበሴ የሚሆኑትን ጫማዎች ይዤ ልምጣ?",
    "Yes, especially for trousers, skirts or occasion pieces where the finished length matters.": "አዎ፣ በተለይ የመጨረሻው ርዝመት ለሚያስፈልግባቸው ሱሪዎች፣ ቀሚሶች ወይም የበዓል ልብሶች።",
    "Can I book an alteration without a consultation?": "ያለ ምክክር ማስተካከያ ማስያዝ እችላለሁ?",
    "Start with First fitting so the garment and the intended result can be reviewed together.": "ልብሱና የሚፈለገው ውጤት በአንድ ላይ እንዲታዩ በመጀመሪያ ልኬት ይጀምሩ።",
    "How far ahead should I book?": "ምን ያህል አስቀድሜ ቀጠሮ ልያዝ?",
    "Bring your event date to the consultation; the atelier will discuss a realistic fitting sequence.": "የዝግጅትዎን ቀን ወደ ምክክሩ ይዘው ይምጡ፤ አቴሊየሩ ተጨባጭ የልኬት ቅደም ተከተል ያወያያል።",
    "Reserve a fitting": "ልኬት ይያዙ",
    "Compare the atelier appointments": "የአቴሊየሩን ቀጠሮዎች ያነጻጽሩ",
    "Bring the garment; bring the occasion": "ልብሱን ይዘው ይምጡ፤ ዝግጅቱንም",
    "Choose the appointment that gives your piece the right amount of attention.": "ለልብስዎ ተገቢውን ትኩረት የሚሰጠውን ቀጠሮ ይምረጡ።",
    "Book an atelier visit": "የአቴሊየር ጉብኝት ይያዙ",
    "First fitting": "የመጀመሪያ ልኬት",
    "Occasion wear consultation": "የበዓል ልብስ ምክክር",
    "A focused fitting appointment to review the garment, take measurements and agree the alteration plan before work begins.": "ሥራው ከመጀመሩ በፊት ልብሱን ለመገምገም፣ ልኬት ለመውሰድና በማስተካከያ ዕቅዱ ላይ ለመስማማት የሚደረግ ትኩረት ያለው የልኬት ቀጠሮ።",
    "A longer atelier conversation for an occasion outfit, covering silhouette, fabric choices, timing and the next fitting.": "ስለ ቅርጽ፣ የጨርቅ ምርጫ፣ ጊዜና ቀጣዩ ልኬት የሚያወያይ ለበዓል አለባበስ የሚደረግ ረዘም ያለ የአቴሊየር ውይይት።",
    "Start with the right atelier conversation": "በትክክለኛው የአቴሊየር ውይይት ይጀምሩ",
    "The person at the fitting table": "በልኬት ጠረጴዛው ያለችው ሰው",
    "Find the Kazanchis atelier": "የካዛንቺሱን አቴሊየር ያግኙ",
    "The atelier approach": "የአቴሊየሩ አቀራረብ",
    "Before you come to the atelier": "ወደ አቴሊየሩ ከመምጣትዎ በፊት",
    "Plan your fitting visit": "የልኬት ጉብኝትዎን ያቅዱ",
    "Atelier lead": "የአቴሊየሩ መሪ",
    "Fittings": "ልኬቶች",
    "Alterations": "ማስተካከያዎች",
    "I left the fitting knowing what would change and what the next visit was for.": "ምን እንደሚቀየርና ቀጣዩ ጉብኝት ለምን እንደሆነ አውቄ ከልኬቱ ወጣሁ።",
    "Kazanchis fitting studio": "የካዛንቺስ የልኬት ስቱዲዮ",
    "Kazanchis, near the old railway station, Courtyard atelier, ground floor, Addis Ababa": "ካዛንቺስ፣ ከአሮጌው የባቡር ጣቢያ አጠገብ፣ የግቢው አቴሊየር፣ ምድር ቤት፣ አዲስ አበባ",
    "Look for the courtyard entrance; the fitting room is at the back of the ground-floor atelier.": "የግቢውን መግቢያ ይፈልጉ፤ የልኬት ክፍሉ በምድር ቤቱ አቴሊየር ጀርባ ይገኛል።",

    # Bloom
    "Natural hair care, with time to breathe": "ለመተንፈስ ጊዜ ያለው የተፈጥሮ ፀጉር እንክብካቤ",
    "A Bole neighbourhood studio for natural hair care, fresh cuts and unrushed styling, with a choice of stylists and two different rooms.": "የፀጉር ሠሪ ምርጫና ሁለት የተለያዩ ክፍሎች ያሉት፣ ለተፈጥሮ ፀጉር እንክብካቤ፣ ለአዲስ ቁርጥና ላልተቸኮለ ሥራ በቦሌ ሰፈር ያለ ስቱዲዮ።",
    "For clients who want a clear plan for wash day, a considered shape or a calmer styling appointment.": "ለፀጉር ማጠቢያ ቀን ግልጽ ዕቅድ፣ የታሰበበት ቅርጽ ወይም የተረጋጋ ቀጠሮ ለሚፈልጉ ደንበኞች።",
    "Bole Bloom Hair Studio was set up for appointments that do not feel hurried. The team talks through texture, routine and the look you want, then chooses the right pace and room for the service.": "ቦሌ ብሉም የፀጉር ስቱዲዮ ያልተቸኮሉ ቀጠሮዎችን ለማድረግ ተቋቋመ። ቡድኑ ስለ ፀጉርዎ ዓይነት፣ ልማድዎና ስለሚፈልጉት መልክ ከተወያየ በኋላ ለአገልግሎቱ ተገቢውን ፍጥነትና ክፍል ይመርጣል።",
    "Three stylists, two rooms and an appointment menu that keeps the conversation visible.": "ሦስት ፀጉር ሠሪዎች፣ ሁለት ክፍሎችና ውይይቱን ግልጽ የሚያደርግ የቀጠሮ ዝርዝር።",
    "A conversation before the chair": "ከወንበሩ በፊት ውይይት",
    "Talk through texture, time and the result you want before the service begins.": "አገልግሎቱ ከመጀመሩ በፊት ስለ ፀጉር ዓይነት፣ ጊዜና ስለሚፈልጉት ውጤት ይወያዩ።",
    "Two room options": "ሁለት የክፍል አማራጮች",
    "Choose the lively main studio or the quieter styling room when the appointment allows.": "ቀጠሮው ሲፈቅድ ሕያው የሆነውን ዋናውን ስቱዲዮ ወይም ጸጥ ያለውን ክፍል ይምረጡ።",
    "A routine you can repeat": "ሊደግሙት የሚችሉት ልማድ",
    "Leave with practical language for caring for your hair between visits.": "በጉብኝቶች መካከል ፀጉርዎን ለመንከባከብ ተግባራዊ ምክር ይዘው ይውጡ።",
    "Which stylist should I choose?": "የትኛውን ፀጉር ሠሪ ልምረጥ?",
    "Choose Hanna for a broad plan, Rahel for wash-care detail or Eden for shaping and a precise cut conversation.": "ለሰፊ ዕቅድ ሐናን፣ ለማጠብና ለእንክብካቤ ዝርዝር ራሔልን፣ ለቅርጽና ለትክክለኛ ቁርጥ ውይይት ኤደንን ይምረጡ።",
    "Can I request the quiet room?": "ጸጥ ያለውን ክፍል መጠየቅ እችላለሁ?",
    "Yes. Select an available appointment and mention the quiet room in your notes; room availability is shown with the booking.": "አዎ። ክፍት ቀጠሮ ይምረጡና በማስታወሻዎ ጸጥ ያለውን ክፍል ይጥቀሱ፤ የክፍል መገኘት ከቀጠሮው ጋር ይታያል።",
    "What if I am not sure which service fits?": "የትኛው አገልግሎት እንደሚስማማ እርግጠኛ ካልሆንኩስ?",
    "Start with Scalp care consultation if the main question is your routine, or book a wash and finish for a service-led visit.": "ዋናው ጥያቄዎ ልማድዎ ከሆነ በራስ ቆዳ እንክብካቤ ምክክር ይጀምሩ፤ ለአገልግሎት ጉብኝት ደግሞ ማጠብና ማሳመርን ይያዙ።",
    "Choose your studio appointment": "የስቱዲዮ ቀጠሮዎን ይምረጡ",
    "Meet the three stylists": "ሦስቱን ፀጉር ሠሪዎች ይተዋወቁ",
    "Your hair appointment can have a little more time": "የፀጉር ቀጠሮዎ ትንሽ ተጨማሪ ጊዜ ሊኖረው ይችላል",
    "Choose a service, stylist and room that fit the kind of visit you want.": "ለሚፈልጉት ዓይነት ጉብኝት የሚስማማ አገልግሎት፣ ፀጉር ሠሪና ክፍል ይምረጡ።",
    "See Bole availability": "በቦሌ ክፍት ሰዓቶችን ይመልከቱ",
    "Wash and finish": "ማጠብና ማሳመር",
    "Cut and shape": "ቁርጥና ቅርጽ",
    "Scalp care consultation": "የራስ ቆዳ እንክብካቤ ምክክር",
    "A complete wash, condition and finish shaped around your texture, preferred volume and the time you have today.": "በፀጉርዎ ዓይነት፣ በሚፈልጉት መጠንና ዛሬ ባለዎት ጊዜ ላይ የተመሠረተ ሙሉ ማጠብ፣ ኮንዲሽነርና ማሳመር።",
    "A 45-minute shape appointment with a clear conversation about length, movement and how the cut should behave between visits.": "ስለ ርዝመት፣ እንቅስቃሴና ቁርጡ በጉብኝቶች መካከል እንዴት መሆን እንዳለበት ግልጽ ውይይት ያለው የ45 ደቂቃ የቅርጽ ቀጠሮ።",
    "A short, practical conversation about your wash routine, comfort and the products already in your bathroom.": "ስለ ማጠቢያ ልማድዎ፣ ምቾትዎና አስቀድመው ስላሏቸው ምርቶች የሚደረግ አጭርና ተግባራዊ ውይይት።",
    "Pick the kind of hair day you want": "የሚፈልጉትን ዓይነት የፀጉር ቀን ይምረጡ",
    "Meet the Bole Bloom team": "የቦሌ ብሉም ቡድንን ይተዋወቁ",
    "Choose your Bole room": "የቦሌ ክፍልዎን ይምረጡ",
    "A calmer salon appointment": "የተረጋጋ የሳሎን ቀጠሮ",
    "Before your Bole appointment": "ከቦሌ ቀጠሮዎ በፊት",
    "Plan your studio visit": "የስቱዲዮ ጉብኝትዎን ያቅዱ",
    "Stylist": "ፀጉር ሠሪ",
    "Natural hair care": "የተፈጥሮ ፀጉር እንክብካቤ",
    "Styling": "ማሳመር",
    "The conversation made it easier to choose the right service instead of guessing.": "ውይይቱ ከመገመት ይልቅ ትክክለኛውን አገልግሎት ለመምረጥ ቀላል አደረገልኝ።",
    "Bole main studio": "የቦሌ ዋና ስቱዲዮ",
    "Bole quiet styling room": "የቦሌ ጸጥ ያለ ክፍል",
    "Bole, off Africa Avenue, Main studio, first floor above the bookshop, Addis Ababa": "ቦሌ፣ ከአፍሪካ ጎዳና ገባ ብሎ፣ ዋናው ስቱዲዮ፣ ከመጽሐፍ መደብሩ በላይ አንደኛ ፎቅ፣ አዲስ አበባ",
    "Bole, off Africa Avenue, Quiet styling room, rear entrance, Addis Ababa": "ቦሌ፣ ከአፍሪካ ጎዳና ገባ ብሎ፣ ጸጥ ያለው ክፍል፣ የኋላ መግቢያ፣ አዲስ አበባ",
    "The main studio is upstairs above the bookshop; please arrive with enough time to choose your room.": "ዋናው ስቱዲዮ ከመጽሐፍ መደብሩ በላይ ነው፤ ክፍልዎን ለመምረጥ በቂ ጊዜ ይዘው ይድረሱ።",
    "Ask at the main entrance for the quiet room; the team will guide you through the rear entrance.": "ጸጥ ያለውን ክፍል በዋናው መግቢያ ይጠይቁ፤ ቡድኑ በኋላ መግቢያ ይመራዎታል።",

    # Tena
    "Scheduled family appointments, clearly explained": "በግልጽ የተብራሩ የቤተሰብ ቀጠሮዎች",
    "A small CMC clinic offering scheduled consultations, practical arrival information and a calm place to discuss everyday family health questions.": "በቀጠሮ የሚደረጉ ምክክሮችን፣ ተግባራዊ የአመጣጥ መረጃንና ስለ ዕለት ተዕለት የቤተሰብ ጤና ጥያቄዎች ለመወያየት የተረጋጋ ቦታን የሚሰጥ በሲኤምሲ ያለ አነስተኛ ክሊኒክ።",
    "For families and individuals looking for a booked consultation time and straightforward information about what to bring.": "የተያዘ የምክክር ሰዓትና ምን ይዘው እንደሚመጡ ግልጽ መረጃ ለሚፈልጉ ቤተሰቦችና ግለሰቦች።",
    "Tena Family Clinic is organised around appointment time and clear communication. The team keeps the visit focused, explains the next step in plain language and directs urgent concerns to appropriate services.": "ጤና የቤተሰብ ክሊኒክ በቀጠሮ ሰዓትና በግልጽ ግንኙነት ዙሪያ የተደራጀ ነው። ቡድኑ ጉብኝቱን ትኩረት ያለው ያደርጋል፣ ቀጣዩን እርምጃ በቀላል ቋንቋ ያብራራል፣ አስቸኳይ ጉዳዮችንም ወደ ተገቢው አገልግሎት ይመራል።",
    "Fictional demonstration content: scheduled consultations only, with no emergency promise and no substitute for professional medical advice.": "ምናባዊ የማሳያ ይዘት፦ በቀጠሮ የሚደረጉ ምክክሮች ብቻ፤ የአስቸኳይ ጊዜ አገልግሎት ቃል አይገባም፤ የባለሙያ የሕክምና ምክርንም አይተካም።",
    "A booked time": "የተያዘ ሰዓት",
    "Select a provider and appointment slot before arriving instead of waiting without a scheduled time.": "ያለ ቀጠሮ ሰዓት ከመጠበቅ ይልቅ ከመምጣትዎ በፊት ባለሙያና የቀጠሮ ሰዓት ይምረጡ።",
    "Plain-language next steps": "በቀላል ቋንቋ ቀጣይ እርምጃዎች",
    "The visit makes room to clarify what was discussed and what should happen next.": "ጉብኝቱ የተወያዩበትንና ቀጥሎ መሆን ያለበትን ለማብራራት ጊዜ ይሰጣል።",
    "Respectful boundaries": "የተከበሩ ወሰኖች",
    "The site explains what the appointment covers and reminds visitors to use urgent services for emergencies.": "ድረ-ገጹ ቀጠሮው ምን እንደሚሸፍን ያብራራል፤ ለአስቸኳይ ሁኔታዎች የአስቸኳይ አገልግሎቶችን እንዲጠቀሙ ያስታውሳል።",
    "Is this an emergency service?": "ይህ የአስቸኳይ ጊዜ አገልግሎት ነው?",
    "No. This demonstration is for scheduled consultations; urgent or emergency concerns should be directed to appropriate emergency services.": "አይደለም። ይህ ማሳያ በቀጠሮ ለሚደረጉ ምክክሮች ነው፤ አስቸኳይ ጉዳዮች ወደ ተገቢው የአስቸኳይ ጊዜ አገልግሎት መቅረብ አለባቸው።",
    "Bring your booking details and any relevant questions, medicine list or previous visit notes.": "የቀጠሮ ዝርዝርዎን እና ተዛማጅ ጥያቄዎችን፣ የመድኃኒት ዝርዝርን ወይም የቀድሞ ጉብኝት ማስታወሻዎችን ይዘው ይምጡ።",
    "Can I book a walk-in slot?": "ያለ ቀጠሮ መምጣት እችላለሁ?",
    "No. Choose an available scheduled appointment so the clinic can prepare for your visit.": "አይቻልም። ክሊኒኩ ለጉብኝትዎ እንዲዘጋጅ ክፍት የሆነ ቀጠሮ ይምረጡ።",
    "Choose a consultation time": "የምክክር ሰዓት ይምረጡ",
    "Read arrival information": "የአመጣጥ መረጃን ያንብቡ",
    "Choose a clear time for the conversation": "ለውይይቱ ግልጽ ሰዓት ይምረጡ",
    "Select the consultation, provider and CMC room that fit your visit.": "ለጉብኝትዎ የሚስማማውን ምክክር፣ ባለሙያና የሲኤምሲ ክፍል ይምረጡ።",
    "View clinic appointments": "የክሊኒኩን ቀጠሮዎች ይመልከቱ",
    "General consultation": "አጠቃላይ ምክክር",
    "Follow-up visit": "የክትትል ጉብኝት",
    "Wellness consultation": "የጤንነት ምክክር",
    "A scheduled 30-minute consultation for discussing the concern you bring, relevant context and reasonable next steps.": "ይዘውት የመጡትን ጉዳይ፣ ተዛማጅ ሁኔታዎችንና ምክንያታዊ ቀጣይ እርምጃዎችን ለመወያየት የሚደረግ የ30 ደቂቃ ቀጠሮ ምክክር።",
    "A focused appointment to review an earlier conversation, clarify questions and record the next agreed action.": "የቀድሞውን ውይይት ለመገምገም፣ ጥያቄዎችን ለማብራራትና የተስማሙበትን ቀጣይ እርምጃ ለመመዝገብ የሚደረግ ትኩረት ያለው ቀጠሮ።",
    "A longer conversation about everyday wellbeing, routines and questions you would like to discuss with a clinician.": "ስለ ዕለት ተዕለት ደኅንነት፣ ልማዶችና ከባለሙያ ጋር ሊወያዩባቸው ስለሚፈልጓቸው ጥያቄዎች የሚደረግ ረዘም ያለ ውይይት።",
    "Select the appointment that fits the question": "ለጥያቄዎ የሚስማማውን ቀጠሮ ይምረጡ",
    "The scheduled consultation team": "የቀጠሮ ምክክር ቡድኑ",
    "Arrive at CMC": "ሲኤምሲ ይድረሱ",
    "How Tena appointments work": "የጤና ቀጠሮዎች እንዴት እንደሚሠሩ",
    "Before a clinic consultation": "ከክሊኒክ ምክክር በፊት",
    "Know before you arrive": "ከመድረስዎ በፊት ይወቁ",
    "Clinician": "ባለሙያ",
    "Family consultations": "የቤተሰብ ምክክሮች",
    "Everyday health questions": "የዕለት ተዕለት የጤና ጥያቄዎች",
    "The arrival details made a scheduled clinic visit feel much less uncertain.": "የአመጣጥ ዝርዝሮቹ የክሊኒክ ጉብኝቴን ከጥርጣሬ ነፃ አደረጉት።",
    "CMC consultation room one": "የሲኤምሲ የምክክር ክፍል አንድ",
    "CMC consultation room two": "የሲኤምሲ የምክክር ክፍል ሁለት",
    "CMC consultation room three": "የሲኤምሲ የምክክር ክፍል ሦስት",
    "CMC, off Equatorial Guinea Street, Tena building, ground floor reception, Addis Ababa": "ሲኤምሲ፣ ከኢኳቶሪያል ጊኒ ጎዳና ገባ ብሎ፣ ጤና ሕንፃ፣ ምድር ቤት መቀበያ፣ አዲስ አበባ",
    "CMC, off Equatorial Guinea Street, Tena building, consultation room two, Addis Ababa": "ሲኤምሲ፣ ከኢኳቶሪያል ጊኒ ጎዳና ገባ ብሎ፣ ጤና ሕንፃ፣ የምክክር ክፍል ሁለት፣ አዲስ አበባ",
    "CMC, off Equatorial Guinea Street, Tena building, consultation room three, Addis Ababa": "ሲኤምሲ፣ ከኢኳቶሪያል ጊኒ ጎዳና ገባ ብሎ፣ ጤና ሕንፃ፣ የምክክር ክፍል ሦስት፣ አዲስ አበባ",
    "Check in at the ground-floor reception and arrive 10 minutes early for a scheduled consultation.": "በምድር ቤቱ መቀበያ ይመዝገቡ፤ ለቀጠሮ ምክክር 10 ደቂቃ ቀደም ብለው ይድረሱ።",
    "Reception will direct you to the assigned consultation room; appointments are not walk-in visits in this demo.": "መቀበያው ወደ ተመደበልዎ የምክክር ክፍል ይመራዎታል፤ በዚህ ማሳያ ያለ ቀጠሮ መምጣት አይቻልም።",
    "Bring your booking details to reception so the team can confirm the room and appointment time.": "ቡድኑ ክፍሉንና የቀጠሮ ሰዓቱን እንዲያረጋግጥ የቀጠሮ ዝርዝርዎን ወደ መቀበያው ይዘው ይምጡ።",

    # Abugida
    "Language practice for the moments that matter": "ለሚያስፈልጉ ጊዜያት የቋንቋ ልምምድ",
    "Practical English and Amharic coaching in Arat Kilo for work, study and everyday conversations, at a pace you can keep.": "ለሥራ፣ ለትምህርትና ለዕለት ተዕለት ውይይት፣ በሚችሉት ፍጥነት፣ በአራት ኪሎ የሚሰጥ ተግባራዊ የእንግሊዝኛና የአማርኛ ስልጠና።",
    "For learners preparing for a workplace conversation, a study goal or a more confident day-to-day exchange.": "ለሥራ ቦታ ውይይት፣ ለትምህርት ግብ ወይም በራስ መተማመን ላለው የዕለት ተዕለት ንግግር ለሚዘጋጁ ተማሪዎች።",
    "Abugida Language Studio treats language practice as a regular habit rather than a performance. Sessions use real situations, useful phrases and a clear next step for the week ahead.": "አቡጊዳ የቋንቋ ስቱዲዮ የቋንቋ ልምምድን እንደ ትርዒት ሳይሆን እንደ መደበኛ ልማድ ይመለከተዋል። ክፍለ ጊዜዎቹ እውነተኛ ሁኔታዎችን፣ ጠቃሚ ሐረጎችንና ለመጪው ሳምንት ግልጽ ቀጣይ እርምጃን ይጠቀማሉ።",
    "Two coaches, two focused rooms and session prompts grounded in the learner’s own situations.": "ሁለት አሠልጣኞች፣ ሁለት ትኩረት የሚሰጡ ክፍሎችና በተማሪው የራሱ ሁኔታ ላይ የተመሠረቱ የልምምድ ጥያቄዎች።",
    "Situations, not worksheets": "ሁኔታዎች እንጂ የሥራ ወረቀቶች አይደሉም",
    "Practise the conversations you are likely to have at work, in class and around town.": "በሥራ፣ በክፍልና በከተማ ውስጥ ሊያደርጓቸው የሚችሉትን ውይይቶች ይለማመዱ።",
    "A small weekly step": "ትንሽ ሳምንታዊ እርምጃ",
    "Each session ends with one manageable prompt to try before the next visit.": "እያንዳንዱ ክፍለ ጊዜ ከቀጣዩ ጉብኝት በፊት የሚሞክሩት አንድ ቀላል ተግባር ይዞ ያበቃል።",
    "Room to try again": "እንደገና ለመሞከር ቦታ",
    "Private practice makes it easier to pause, repeat a phrase and ask what sounds natural.": "የግል ልምምድ ለማቆም፣ ሐረግ ለመድገምና ተፈጥሯዊ የሚመስለውን ለመጠየቅ ቀላል ያደርጋል።",
    "Do I need to know any Amharic?": "ምንም አማርኛ ማወቅ ያስፈልገኛል?",
    "No. The starter session is designed for a first useful set of phrases and sounds.": "አያስፈልግም። የጀማሪ ክፍለ ጊዜው ለመጀመሪያዎቹ ጠቃሚ ሐረጎችና ድምጾች የተዘጋጀ ነው።",
    "Can sessions focus on work?": "ክፍለ ጊዜዎች በሥራ ላይ ማተኮር ይችላሉ?",
    "Yes. Bring a meeting, introduction, email or phone situation you would like to rehearse.": "አዎ። ሊለማመዱት የሚፈልጉትን ስብሰባ፣ መግቢያ፣ ኢሜይል ወይም የስልክ ሁኔታ ይዘው ይምጡ።",
    "Which room will I use?": "የትኛውን ክፍል እጠቀማለሁ?",
    "Your booking shows the assigned learning or conversation room; both are in the Arat Kilo studio.": "ቀጠሮዎ የተመደበልዎን የመማሪያ ወይም የውይይት ክፍል ያሳያል፤ ሁለቱም በአራት ኪሎ ስቱዲዮ ውስጥ ናቸው።",
    "Choose your first practice": "የመጀመሪያ ልምምድዎን ይምረጡ",
    "See the coaching options": "የስልጠና አማራጮቹን ይመልከቱ",
    "Put one real conversation on the calendar": "አንድ እውነተኛ ውይይት በቀን መቁጠሪያ ላይ ያስቀምጡ",
    "Choose a language, a provider and a practice room for the next step.": "ለቀጣዩ እርምጃ ቋንቋ፣ አሠልጣኝና የልምምድ ክፍል ይምረጡ።",
    "Book a language session": "የቋንቋ ክፍለ ጊዜ ይያዙ",
    "English conversation coaching": "የእንግሊዝኛ ውይይት ስልጠና",
    "Amharic starter session": "የአማርኛ ጀማሪ ክፍለ ጊዜ",
    "A 60-minute practice session using work, study or everyday scenarios chosen with the learner.": "ከተማሪው ጋር በተመረጡ የሥራ፣ የትምህርት ወይም የዕለት ተዕለት ሁኔታዎች የሚደረግ የ60 ደቂቃ ልምምድ።",
    "A welcoming 45-minute introduction to useful Amharic phrases, pronunciation and a simple practice plan.": "ጠቃሚ የአማርኛ ሐረጎችን፣ አጠራርንና ቀላል የልምምድ ዕቅድን የሚያስተዋውቅ ምቹ የ45 ደቂቃ መግቢያ።",
    "Choose a useful place to practise": "ለመለማመድ ጠቃሚ ቦታ ይምረጡ",
    "Your language practice partners": "የቋንቋ ልምምድ አጋሮችዎ",
    "Find the Arat Kilo rooms": "የአራት ኪሎ ክፍሎችን ያግኙ",
    "Practice for real situations": "ለእውነተኛ ሁኔታዎች ልምምድ",
    "Before your first practice": "ከመጀመሪያ ልምምድዎ በፊት",
    "Make the room easy to find": "ክፍሉን በቀላሉ ያግኙ",
    "Language coach": "የቋንቋ አሠልጣኝ",
    "Conversation practice": "የውይይት ልምምድ",
    "Useful phrases": "ጠቃሚ ሐረጎች",
    "Practising a situation I was about to face made the next conversation feel possible.": "ልገጥመው የነበረውን ሁኔታ መለማመዴ ቀጣዩን ውይይት የሚቻል አደረገው።",
    "Arat Kilo learning room": "የአራት ኪሎ መማሪያ ክፍል",
    "Arat Kilo conversation room": "የአራት ኪሎ የውይይት ክፍል",
    "Arat Kilo, near the university gate, Learning room, second floor above the stationery shop, Addis Ababa": "አራት ኪሎ፣ ከዩኒቨርሲቲው በር አጠገብ፣ የመማሪያ ክፍል፣ ከጽሕፈት መሣሪያ መደብሩ በላይ ሁለተኛ ፎቅ፣ አዲስ አበባ",
    "Arat Kilo, near the university gate, Conversation room, second floor, room 4, Addis Ababa": "አራት ኪሎ፣ ከዩኒቨርሲቲው በር አጠገብ፣ የውይይት ክፍል፣ ሁለተኛ ፎቅ፣ ክፍል 4፣ አዲስ አበባ",
    "Enter above the stationery shop and ask for the learning room; plan a few minutes for the stairs.": "ከጽሕፈት መሣሪያ መደብሩ በላይ ይግቡና የመማሪያ ክፍሉን ይጠይቁ፤ ለደረጃው ጥቂት ደቂቃዎችን ያስቡ።",
    "The conversation room is marked at the end of the second-floor corridor.": "የውይይት ክፍሉ በሁለተኛው ፎቅ ኮሪደር መጨረሻ ላይ ምልክት ተደርጎበታል።",
}


def localized(text, am=None):
    """Localized plain text. The Amharic value comes from `am` or from the table."""
    value = {"en": text}
    translated = am if am is not None else AM.get(text)
    if translated:
        value["am"] = translated
    return value


def joined(*parts):
    """Join localized sentences; Amharic is present only when every part has it."""
    english = " ".join(part["en"] for part in parts if part.get("en"))
    amharic = [part.get("am") for part in parts if part.get("en")]
    return localized(english, " ".join(amharic) if all(amharic) else "")


def hours(days, closed, opens, closes):
    """Opening hours in both languages, with a plain hyphen for the time range."""
    english = f"Open {', '.join(days)}, {opens:02}:00-{closes:02}:00 East Africa Time."
    amharic = f"{'፣ '.join(DAY_AM[day] for day in days)} ከ{opens:02}:00-{closes:02}:00 (የምሥራቅ አፍሪካ ሰዓት) ክፍት ነው።"
    if closed:
        english += f" Closed {', '.join(closed)}."
        amharic += f" {'፣ '.join(DAY_AM[day] for day in closed)} ዝግ ነው።"
    return localized(english, amharic)


def scene(key, number):
    """A support photo as owner content: the asset path and its alt text."""
    english, amharic = SCENES[key][number - 1]
    return {"image": f"{SUPPORT}/{key}/scene-{number}.webp", "imageAlt": localized(english, amharic)}


# Section headings and intros written for each business, so no two sites share them.
# Each value is (English, Amharic).
SECTION_COPY = {
    "selam": {
        "process_title": ("How a first session goes", "የመጀመሪያው ክፍለ ጊዜ እንዴት እንደሚሄድ"),
        "process_intro": ("From booking to the short routine you take home.", "ከቀጠሮ ማስያዝ እስከ ቤት የሚወስዱት አጭር ልምምድ።"),
        "benefits_title": ("What the hour is built around", "ሰዓቱ በምን ላይ እንደተገነባ"),
        "testimonials_title": ("From a client", "ከአንድ ደንበኛ"),
        "proof_title": ("The practice in short", "ልምምዱ በአጭሩ"),
        "providers_intro": ("One coach for every session.", "ለእያንዳንዱ ክፍለ ጊዜ አንድ አሠልጣኝ።"),
        "locations_intro": ("A private room in Gerji with tall windows over the city.", "በገርጂ፣ ወደ ከተማው የሚመለከቱ ረጃጅም መስኮቶች ያሉት የግል ክፍል።"),
    },
    "meron": {
        "process_title": ("From first fitting to final adjustment", "ከመጀመሪያው ልኬት እስከ መጨረሻው ማስተካከያ"),
        "process_intro": ("How a garment moves through the atelier.", "ልብስ በአቴሊየሩ ውስጥ እንዴት እንደሚያልፍ።"),
        "benefits_title": ("What the fitting table is for", "የመለኪያ ጠረጴዛው ለምን እንደሆነ"),
        "testimonials_title": ("A note from the fitting room", "ከመለኪያ ክፍሉ የተገኘ ማስታወሻ"),
        "proof_title": ("The atelier in short", "አቴሊየሩ በአጭሩ"),
        "providers_intro": ("The person who measures is the person who sews.", "የሚለካው ሰው የሚሰፋውም ሰው ነው።"),
        "locations_intro": ("A courtyard atelier in Kazanchis.", "በካዛንቺስ በግቢ ውስጥ ያለ አቴሊየር።"),
    },
    "bloom": {
        "process_title": ("Your visit, from chair to mirror", "ጉብኝትዎ፣ ከወንበር እስከ መስተዋት"),
        "process_intro": ("What happens between arriving and seeing the result.", "ከመድረስ እስከ ውጤቱን ማየት ድረስ የሚሆነው።"),
        "benefits_title": ("How the studio works", "ስቱዲዮው እንዴት እንደሚሠራ"),
        "testimonials_title": ("Said in the chair", "በወንበሩ ላይ የተባለ"),
        "proof_title": ("The studio in short", "ስቱዲዮው በአጭሩ"),
        "providers_intro": ("Three stylists, each with a different strength.", "ሦስት ፀጉር ሠሪዎች፣ እያንዳንዳቸው የተለየ ጥንካሬ ያላቸው።"),
        "locations_intro": ("Two rooms off Africa Avenue: one lively, one quiet.", "ከአፍሪካ ጎዳና ገባ ብሎ ሁለት ክፍሎች፤ አንዱ ሕያው፣ አንዱ ጸጥ ያለ።"),
    },
    "tena": {
        "process_title": ("From booking to the consultation room", "ከቀጠሮ ማስያዝ እስከ ምክክር ክፍሉ"),
        "process_intro": ("Each step of a scheduled visit, in order.", "የቀጠሮ ጉብኝት እያንዳንዱ ደረጃ በቅደም ተከተል።"),
        "benefits_title": ("What a booked appointment changes", "የተያዘ ቀጠሮ የሚለውጠው"),
        "testimonials_title": ("Patient feedback", "የታካሚ አስተያየት"),
        "proof_title": ("The clinic in short", "ክሊኒኩ በአጭሩ"),
        "providers_intro": ("The clinicians who see booked patients.", "ቀጠሮ የያዙ ታካሚዎችን የሚያዩ ባለሙያዎች።"),
        "locations_intro": ("Reception is on the ground floor and assigns your room.", "መቀበያው ምድር ቤት ላይ ሲሆን ክፍልዎን ይመድባል።"),
    },
    "abugida": {
        "process_title": ("How a practice session runs", "የልምምድ ክፍለ ጊዜ እንዴት እንደሚካሄድ"),
        "process_intro": ("Three steps, repeated every week.", "በየሳምንቱ የሚደገሙ ሦስት ደረጃዎች።"),
        "benefits_title": ("What the sessions are built on", "ክፍለ ጊዜዎቹ በምን ላይ እንደተገነቡ"),
        "testimonials_title": ("From a learner", "ከአንድ ተማሪ"),
        "proof_title": ("Lessons in short", "ትምህርቶቹ በአጭሩ"),
        "providers_intro": ("Two coaches, two languages.", "ሁለት አሠልጣኞች፣ ሁለት ቋንቋዎች።"),
        "locations_intro": ("Two rooms near the university gate in Arat Kilo.", "በአራት ኪሎ ከዩኒቨርሲቲው በር አጠገብ ሁለት ክፍሎች።"),
    },
}

# Process steps for each showcase business.
# Each step is ((title en, title am), (description en, description am)).
PROCESS_STEPS = {
    "selam": [
        (("Book a consultation", "ምክክር ይያዙ"), ("Pick a time that sits around your working week.", "ከሥራ ሳምንትዎ ጋር የሚስማማ ሰዓት ይምረጡ።")),
        (("Talk, then move", "መጀመሪያ ይነጋገሩ፣ ከዚያ ይንቀሳቀሱ"), ("The first part is a conversation; the movement comes after.", "የመጀመሪያው ክፍል ውይይት ነው፤ እንቅስቃሴው ከዚያ በኋላ ይመጣል።")),
        (("Take one routine home", "አንድ ልምምድ ይዘው ይሂዱ"), ("Leave with a short sequence you can repeat at a desk or at home.", "በጠረጴዛ አጠገብ ወይም በቤት ሊደግሙት የሚችሉትን አጭር ቅደም ተከተል ይዘው ይውጡ።")),
    ],
    "meron": [
        (("Bring the garment", "ልብሱን ይዘው ይምጡ"), ("Bring it with the shoes and layers you will wear with it.", "አብረው ከሚለብሷቸው ጫማዎችና ልብሶች ጋር ይዘው ይምጡ።")),
        (("Measure and agree", "ይለኩና ይስማሙ"), ("Measurements are taken and the plan is agreed before work begins.", "ሥራው ከመጀመሩ በፊት ልኬቶች ይወሰዳሉ፤ ዕቅዱም ይጸድቃል።")),
        (("Fit again", "እንደገና ይለኩ"), ("A second fitting checks the change before the final finish.", "ሁለተኛው ልኬት ከመጨረሻው ሥራ በፊት ለውጡን ያረጋግጣል።")),
    ],
    "bloom": [
        (("Choose a stylist and a room", "ፀጉር ሠሪና ክፍል ይምረጡ"), ("Pick the person and the room that suit the visit you want.", "ለሚፈልጉት ጉብኝት የሚስማሙትን ሰውና ክፍል ይምረጡ።")),
        (("Talk it through first", "መጀመሪያ ይወያዩበት"), ("Texture, time and the result are agreed before the service starts.", "አገልግሎቱ ከመጀመሩ በፊት የፀጉር ዓይነት፣ ጊዜና ውጤቱ ይወሰናሉ።")),
        (("Leave with a routine", "ልማድ ይዘው ይውጡ"), ("You go home knowing how to care for it until the next visit.", "እስከሚቀጥለው ጉብኝት እንዴት እንደሚንከባከቡት አውቀው ወደ ቤት ይሄዳሉ።")),
    ],
    "tena": [
        (("Book a time", "ሰዓት ይያዙ"), ("Choose the consultation and a clinician before you travel.", "ከመንቀሳቀስዎ በፊት ምክክሩንና ባለሙያውን ይምረጡ።")),
        (("Check in at reception", "በመቀበያው ይመዝገቡ"), ("Arrive ten minutes early; reception confirms your room.", "አሥር ደቂቃ ቀደም ብለው ይድረሱ፤ መቀበያው ክፍልዎን ያረጋግጣል።")),
        (("Leave with a next step", "ቀጣይ እርምጃ ይዘው ይውጡ"), ("The visit ends with the agreed follow-up written down.", "ጉብኝቱ የተስማሙበት ቀጣይ ክትትል ተጽፎ ይጠናቀቃል።")),
    ],
    "abugida": [
        (("Pick a real situation", "እውነተኛ ሁኔታ ይምረጡ"), ("Bring a meeting, a call or a conversation you are about to have.", "ሊያደርጉት ያሰቡትን ስብሰባ፣ ጥሪ ወይም ውይይት ይዘው ይምጡ።")),
        (("Practise it aloud", "ጮክ ብለው ይለማመዱት"), ("Rehearse the phrases until they feel natural.", "ሐረጎቹ ተፈጥሯዊ እስኪሆኑ ድረስ ይለማመዷቸው።")),
        (("Take one prompt away", "አንድ ተግባር ይዘው ይሂዱ"), ("Try one small task before the next session.", "ከሚቀጥለው ክፍለ ጊዜ በፊት አንድ ትንሽ ተግባር ይሞክሩ።")),
    ],
}


def section_copy(key, field, english_default):
    """A business's own heading or intro, or the shared English default."""
    pair = SECTION_COPY.get(key, {}).get(field)
    return localized(*pair) if pair else localized(english_default)
