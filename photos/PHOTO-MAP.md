# Evochia Site Photos — Assignment Map
## Format: WebP (web-optimized, smaller files, all modern browsers)

---

## 📋 CATERING PAGE — Event Type Cards (catering.html)

| Filename                    | Content                              | Card           |
|-----------------------------|--------------------------------------|----------------|
| `wedding-catering.webp`     | Asian fusion food spread (abundance) | Weddings       |
| `family-celebration.webp`   | Charcuterie/buffet table             | Family Events  |
| `corporate-event.webp`      | Elegant green/gold table setting     | Corporate      |
| `themed-night.webp`         | BBQ grill with embers                | Themed         |

## 📋 ABOUT PAGE (about.html + index.html teaser)

| Filename              | Content                        | Section        |
|-----------------------|--------------------------------|----------------|
| `chef-plating.webp`   | Artisan tartlets with garnish  | Our Story + HP |

## 📋 PRIVATE CHEF — 8 Cuisine Cards (private-chef.html)

| Filename                      | Content                              | Cuisine         | Quality |
|-------------------------------|--------------------------------------|-----------------|---------|
| `cuisine-mediterranean.webp`  | Greek salad, feta, bread             | Mediterranean   | ★★★     |
| `cuisine-nikkei.webp`         | Salmon sushi roll with tobiko        | Nikkei          | ★★★     |
| `cuisine-italian.webp`        | Farfalle pesto pasta, tomatoes       | Italian         | ★★★     |
| `cuisine-french.webp`         | Salmon filet, wine glass, fine dine  | French          | ★★★     |
| `cuisine-japanese.webp`       | Candlelit table setting, minimalist  | Japanese        | ★★☆     |
| `cuisine-mexican.webp`        | Flatbread/pizza with cilantro        | Mexican         | ★★☆     |
| `cuisine-asian.webp`          | Outdoor garden dinner setup          | Asian Fusion    | ★★☆     |
| `cuisine-chefs-table.webp`    | Fine dining plate service, champagne | Chef's Table    | ★★★     |

### ⚠️ Notes on replaceable images
- **cuisine-japanese**: Shows table atmosphere rather than Japanese food. Could replace with a sashimi/tempura photo.
- **cuisine-mexican**: Shows flatbread, not distinctly Mexican. Could replace with a tacos/guacamole photo.
- **cuisine-asian**: Shows outdoor table, not Asian food. Consider swapping with the wedding-catering content (which IS Asian fusion food) if an alternative wedding image is sourced.

## 📋 THEMED EXPERIENCES — Bonus Photos (for future use)

| Prefix          | Photos              | Theme          |
|-----------------|---------------------|----------------|
| `pizza-night-`  | 01, 02, 03 (.webp)  | Pizza Night    |
| `bbq-night-`    | 01, 02, 03 (.webp)  | BBQ Night      |
| `greek-night-`  | 01, 02, 03 (.webp)  | Greek Meze     |
| `street-food-`  | 01, 02, 03 (.webp)  | Street Food    |
| `souvlaki.jpg`  | Single              | Greek Souvlaki |

---

## ⚙️ HTML Reference Update

Since files are `.webp` (not `.jpg`), update HTML references:

```
photos/wedding-catering.webp     (was .jpg)
photos/family-celebration.webp   (was .jpg)
photos/corporate-event.webp      (was .jpg)
photos/themed-night.webp         (was .jpg)
photos/chef-plating.webp         (was .jpg)
photos/cuisine-mediterranean.webp
photos/cuisine-nikkei.webp
photos/cuisine-italian.webp
photos/cuisine-french.webp
photos/cuisine-japanese.webp
photos/cuisine-mexican.webp
photos/cuisine-asian.webp
photos/cuisine-chefs-table.webp
```

All `--bg:url('photos/xxx.jpg')` in HTML should become `--bg:url('photos/xxx.webp')`.
