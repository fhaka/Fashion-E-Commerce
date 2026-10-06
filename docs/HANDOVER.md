# Your online shop: owner's guide

Everything you need to run your shop day to day. You manage it all from the **admin**:
go to `https://your-shop.com/login`, sign in with your admin account, and you land on the dashboard.

Some features depend on your package. They're marked **(Advanced)** or **(Premium)**. You can
see exactly what yours includes under **Settings → Your plan**.

---

## First things first

1. **Change your password**: open your account (the person icon in the shop) → Profile → Change password.
2. **Check your settings**: Admin → **Settings**: store name, logo, contact details, shipping prices, tax and colours.
3. **Read your legal pages**: Admin → **Pages** → Privacy policy and Terms of sale. They were checked by your lawyer before launch; update them if anything changes in your business.

---

## Every day: orders

**Admin → Orders** lists every order, newest first. Search by order number, customer name or email.

| Status | Meaning | What you do |
|---|---|---|
| **Pending** | The customer is paying. Stock is held for them (30 minutes). | Nothing. It becomes *Paid* or is released automatically. |
| **Paid** | Payment received, ready to prepare. | Pack it, then click **Mark as processing**. |
| **Processing** | Being prepared. | When it leaves, enter the carrier and tracking number and click **Mark as shipped**. |
| **Shipped** | On its way. The customer can follow it. | When it arrives, click **Mark as delivered**. |
| **Delivered** | Done. | Nothing. |
| **Cancelled / Refunded** | Stopped, and the money returned. | See below. |

- **Shipping emails (Advanced):** when you mark an order shipped or delivered, the customer gets an email with the tracking number.
- **Refunds (Advanced):** open the order → **Refund order**. Tick **Return items to stock** if the products are back on your shelf. The customer gets an email, and with Stripe the money is returned automatically.
- **Notes:** anything you type in the timeline note is shown to the customer in their order history.

---

## Products

**Admin → Products → New product.**

1. **Details:** name, description, details (one per line), materials and care, category, gender.
2. **Pricing:** price, and optionally a "compare at" price to show it on sale.
3. **Images:** upload photos (or drop them onto the image area, or paste an image link), then drag them into order (the first is the main one). You can link an image to a colour, so choosing that colour shows its photos.
   *Best results: portrait 4:5 photos, at least 1600 px wide.*
4. **Variants:** every size × colour combination, each with its own stock (and optionally its own price).
5. **Visibility:** *Draft* hides it from the shop, *Active* publishes it, *Archived* retires it.
6. **Labels:** *New*, *Best seller* and *Featured* control where it appears on the home page.
7. **SEO (optional):** the title and description Google shows. A live preview shows how it will look.

Other useful actions: **Duplicate** (copy a product to make a similar one) and bulk actions on the product list (publish, hide or label several at once).

**Sizes & colours:** set up your size scale and colour swatches once; every product uses them.
**Categories:** your shop's structure (e.g. Women → Dresses), each with an image and description.
**Collections (Advanced):** curated groups such as "Summer edit", each with its own page.

---

## Stock

**Admin → Inventory** shows every variant with what's available, what's held by customers who
are paying, and what's on hand.

- To change stock, type the new **on-hand** quantity (after a delivery or a stock-take) and a short reason such as "Delivery" or "Damaged", then save.
- Variants at or below their low-stock threshold are highlighted. **(Advanced)** They also appear on the dashboard.
- **History (Premium):** every stock movement and why: sales, refunds, cancellations and manual changes with their reason.

Sold-out sizes can't be bought; the shop shows "sold out" or "only 2 left" automatically.

---

## Marketing

- **Discount codes** (Admin → Coupons): percentage off, a fixed amount off, or free shipping. Optional minimum spend, start and end dates, a total number of uses, and uses per customer. Customers enter the code at checkout.
- **Homepage banners** (Admin → Homepage banners): the hero slideshow at the top of the home page (image, title, text and button). **(Premium)** also the campaign banner, brand story and lookbook. You can schedule banners with start and end dates.
- **Newsletter (Advanced)** (Admin → Newsletter & messages): everyone who signed up. **Export CSV** to import them into your email tool (Mailchimp, Klaviyo…).
- **Reviews (Advanced)** (Admin → Reviews): new reviews wait for your approval before they appear. Reviews from real buyers show "Verified purchase".

---

## Your shop's content

- **Settings:** name, logo, colours, contact details, social links, the announcement bar at the top of every page, home page highlights, shipping prices and delivery times, free-shipping threshold, tax, and the return window. Saving updates the whole shop immediately.
- **Pages:** About, Shipping & returns, Privacy and Terms. Use `## Heading` for sections, `- ` for lists and `**bold**`. Words in double braces such as `{{return_days}}` are filled in from Settings automatically, so leave them as they are. The preview shows the result before you save.

---

## Customers and messages

- **Customers:** order history, lifetime value and saved addresses. You can disable an account if needed.
- **Staff access:** to give a colleague admin access, ask them to create a normal account, then open them in Customers and change their role to **Admin**. Remove it the same way when they leave.
- **Messages:** what people send through the contact form. Click an email address to reply.

---

## Reports

- **Dashboard:** revenue, orders, average order value and new customers for the last 7, 30 or 90 days or 12 months. **(Advanced)** adds charts, comparison with the previous period, top products and low-stock alerts.
- **Sales reports (Premium):** revenue by day, week or month and by category, with **Export CSV** for your accountant.

---

## Things that happen automatically

- Stock is held while a customer pays and released if they don't finish.
- Customers get emails: welcome, order confirmation, password reset, and **(Advanced)** shipping, delivery and refund updates.
- Card payments are confirmed directly by Stripe; nobody can mark an order paid without the money arriving.
- The shop's pages update within seconds of any change you make in the admin.

---

## Good habits

- Use a strong, unique password, and never share your admin login: create staff accounts instead.
- Check **Pending** orders older than an hour only if a customer contacts you; they normally resolve themselves.
- Keep product photos consistent (same background and proportions) for a polished shop.
- Before a sale, create the discount code and a banner in advance, with start and end dates.

## Getting help

For anything technical (domain, payments, email delivery, adding features or upgrading your
package), contact your developer. Your products, orders and settings are kept when your package
is upgraded.
