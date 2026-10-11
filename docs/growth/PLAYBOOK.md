# Growth playbook

This playbook tells the team how to get service businesses onto the platform without paid ads.
It uses only features that are in the product. The product name, the reward numbers and the setup
time come from the settings, so this document uses placeholders:

| Placeholder | Where the value comes from |
|---|---|
| `<product>` | Platform Brand Settings, `product_name` |
| `<host>` | Platform Brand Settings, `short_host` |
| `<N>` minutes | Growth Settings, `marketing_live_minutes` |
| `<threshold>` bookings | Growth Settings, `referral_threshold_bookings` |
| `<reward>` free bookings | Growth Settings, `partner_reward_free_bookings` (partners) and `referral_reward_free_bookings` (businesses) |

The platform administrator edits these values on the staff page **Platform → Brand & growth**.

## 1. The strategy: one cluster at a time

A cluster is one area and one trade. Examples:

- Salons and barbers in Bole.
- Clinics and dental offices in Kazanchis.
- Tutors near Addis Ababa University (Sidist Kilo, Arat Kilo) and near AASTU.

Work on one cluster until it has about 20 active businesses. Then start the next cluster.

Clusters work because the growth features feed each other inside one area:

1. A customer books at a salon. The booking page, the email and the SMS carry a small
   "Get your own booking page" link (source `powered_by_page`, `powered_by_email`, `powered_by_sms`).
2. The salon prints its poster with the QR code and its hours in both clocks. Its neighbors see it.
3. The salon owner shares a referral link. The owner and the new business each get free bookings
   when the new business reaches `<threshold>` real bookings.
4. The public directory lists the cluster (for example, salons in Bole). Each new business makes the
   page more useful to customers (source `directory`).

Do not start two clusters in the same trade at the same time. Do not start a cluster that the team
cannot visit in person each week.

### How to pick the next cluster

Pick the cluster that has most of these:

- Many businesses of one trade on a few streets.
- Businesses that already take bookings by phone or Telegram.
- An association, a school or a Telegram channel that the owners trust.
- A team member who speaks the language of the owners and can visit.

## 2. Partners

Partners bring many businesses at one time. The partner page is `/partners` (English) and
`/am/partners` (Amharic). It explains the program, gives a Telegram admin kit and takes applications.
An administrator approves applications on `/admin/referrals`. Approval gives the partner a code.

| Partner | What they get from us | What we ask |
|---|---|---|
| Association (salon, clinic, trade) | Free tools for members, a partner code, `<reward>` free bookings for each business that reaches `<threshold>` bookings | Introduce us at a meeting. Post the kit in the members' group. |
| Beauty or medical school | A booking page for each graduate from the first day of work | Show the product in the last month of the course. |
| Coaching group or incubator | A tool that their businesses need on day one | Add the setup to the program checklist. |
| Trainer | A partner code and the rewards | Show the setup in a training session. |
| Telegram channel admin | Ready-to-post messages in Amharic and English | Post the tools message, then the booking page message one week later. |

### How to approach a partner

1. Find the person who runs the group. Do not start with a general address.
2. Show one business from their own cluster that already uses the product.
3. Offer the free tools first. They cost the partner nothing and help their members today.
4. Ask for one action with a date, for example "Post this message on Tuesday".
5. Send the `/partners` link. Ask them to apply, so that their sign-ups count for them.
6. Approve the application the same day. Send the code and the sign-up link `<host>/signup?ref=CODE`.
7. Call again after two weeks. Show them how many businesses joined with their code.

## 3. Messages to use

Replace `CODE` with the partner or business code. Keep the links as they are, so the sign-up source
is recorded.

### First message to an association or school

English:

> Hello [name]. We make `<product>`, online booking for Ethiopian service businesses. It works in
> Amharic and English, and it shows Habesha time and the Ethiopian calendar. Your members can start
> for free and have a booking page in about `<N>` minutes. We also have free tools that they can use
> today, with no sign-up. Can we show it to your members for ten minutes at your next meeting?

Amharic:

> ሰላም [ስም]። እኛ `<product>`ን እንሠራለን፤ ለኢትዮጵያ የአገልግሎት ንግዶች የኦንላይን ቀጠሮ ማስያዣ ነው።
> በአማርኛና በእንግሊዝኛ ይሠራል፤ የሀበሻ ሰዓትና የኢትዮጵያ ዘመን አቆጣጠርንም ያሳያል። አባላትዎ በነጻ ጀምረው
> በ`<N>` ደቂቃ ገደማ የቀጠሮ ገጽ ሊኖራቸው ይችላል። ዛሬውኑ ያለ ምዝገባ የሚጠቀሙባቸው ነጻ መሣሪያዎችም አሉን።
> በሚቀጥለው ስብሰባችሁ ለአሥር ደቂቃ ለአባላትዎ ልናሳይ እንችላለን?

### First message to a Telegram channel admin

English:

> Hello. Your channel helps business owners in [area]. We have free tools that your members can use
> today: an Ethiopian time converter, an Ethiopian calendar converter and Amharic reminder messages.
> We have a ready post in Amharic and English on `<host>/partners`. If you apply as a partner, you get
> a code and a reward for each business that joins with it.

Amharic:

> ሰላም። ቻናልዎ በ[አካባቢ] ያሉ የንግድ ባለቤቶችን ይረዳል። አባላትዎ ዛሬውኑ የሚጠቀሙባቸው ነጻ መሣሪያዎች አሉን፦
> የኢትዮጵያ ሰዓት መቀየሪያ፣ የኢትዮጵያ ቀን መቀየሪያና የአማርኛ የማስታወሻ መልዕክቶች። በአማርኛና በእንግሊዝኛ
> የተዘጋጀ ፖስት `<host>/partners` ላይ አለ። አጋር ለመሆን ካመለከቱ ኮድ ያገኛሉ፤ በኮዱ ለሚቀላቀል እያንዳንዱ
> ንግድ ሽልማት አለ።

The ready-to-post Telegram messages are on the partners page, in the "Telegram admin kit" section.
They link to the tools with `?source=partner_CODE` and to sign-up with `?ref=CODE&source=partner`.

### Visit to a business in the cluster

English:

> Your customers can book with you online, in Amharic, at any hour. You get reminders that cut
> no-shows, and you see your day on your phone. It is free to start. Let me set it up with you now.
> It takes about `<N>` minutes.

Amharic:

> ደንበኞችዎ በማንኛውም ሰዓት በአማርኛ በኦንላይን ቀጠሮ ሊይዙ ይችላሉ። ማስታወሻዎች ቀጠሮ የሚያልፋቸውን ደንበኞች
> ይቀንሳሉ፤ የቀኑን ፕሮግራምዎን በስልክዎ ያያሉ። መጀመር ነጻ ነው። አሁን አብረን እናዘጋጀው፤ `<N>` ደቂቃ ገደማ ይወስዳል።

During the visit, finish the setup with the owner: sign-up, business, first service, publish. Then
print the poster from the **Grow** page and put it near the door.

## 4. What to measure

Every new business records how it found the product. Sign-up pages accept `?source=<channel>` and
`?ref=<code>`. The record is the **Business Signup Source** DocType.

| Source value | Meaning |
|---|---|
| `powered_by_page` | The "get your own page" link on a booking page |
| `powered_by_email` | The link in a customer email |
| `powered_by_sms` | The link in a customer SMS |
| `customer_prompt` | The prompt to customers who also run a business |
| `tool_<slug>` | A free tool page, for example `tool_ethiopian-time-converter` |
| `directory` | The public business directory |
| `year_review` | A shared year-in-review image |
| `template_credit` | The footer credit on a public site template |
| `partner` | A partner link or post |
| `telegram_share` | A link shared to Telegram from the Grow page |
| `referral` | A referral code without another source |
| `direct` | No source |

Where to see the numbers:

- `/admin/referrals`: totals, referrals, sign-up sources for 30 and 90 days, and partner applications.
- Desk, **Business Signup Source** list: one row for each new business, with its source and code.
  Group by `source` to compare channels.
- Desk, **Business Referral** list: which referred businesses reached `<threshold>` bookings.

Review these numbers each week, for each cluster:

1. New businesses, by source.
2. Businesses that published their booking page.
3. Businesses that reached `<threshold>` real bookings (the "active" count for the cluster).
4. Partner codes with at least one active business.

A channel that brings sign-ups but few active businesses needs a better first week, not more sign-ups.

## 5. The 30/60/90-day plan

### Days 1 to 30: one cluster, by hand

- Pick the first cluster: salons and barbers in Bole.
- Visit 40 businesses. Set up each willing business during the visit.
- Sign one salon association and one beauty school as partners.
- Ask two Telegram channels for business owners to post the tools message.
- Target: 20 published booking pages, 10 active businesses in the cluster.

### Days 31 to 60: let the loop work

- Ask each active business to print its poster and share its referral link.
- Help the partners post the kit. Approve every application within one day.
- Start the second cluster: clinics in Kazanchis. Use the clinic stories from the first cluster's
  partners as proof.
- Target: 50 active businesses. At least 30% of new sign-ups come from `powered_by_*`, `referral`,
  `partner` or `directory`, not from visits.

### Days 61 to 90: repeat what worked

- Compare the sources. Put the team's time into the two channels with the most active businesses.
- Start the third cluster: tutors near the universities. Use the tool pages and Telegram channels
  for students.
- Ask the first partners for an introduction to one more association each.
- Target: 100 active businesses across three clusters. Each cluster has at least one active partner.

## 6. Rules

- Say only what is true. The landing page reads the free tier and the setup time from the settings.
  Use the same numbers in every message.
- Do not promise SMS reminders to a business until the platform SMS provider is configured.
- Do not add a business without the owner. The owner signs up and publishes.
- Do not use real customer names or photos in examples without permission.
