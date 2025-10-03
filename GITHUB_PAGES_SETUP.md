# GitHub Pages Setup Guide

## ✅ What's Been Created

A beautiful, modern landing page for your GitHub to IDE extension in the `/docs` folder.

## 🎨 Features

- **Modern Design**: Clean, professional appearance with smooth animations
- **Responsive**: Looks great on desktop, tablet, and mobile
- **Fast**: Pure HTML/CSS with no dependencies
- **SEO Optimized**: Proper meta tags for search engines and social media
- **Accessible**: Semantic HTML and proper contrast ratios

## 🚀 Enable GitHub Pages

### Step 1: Push to GitHub

```bash
git add docs/
git commit -m "Add GitHub Pages site"
git push origin main
```

### Step 2: Enable Pages in Settings

1. Go to: https://github.com/justinloveless/github-to-ide/settings/pages
2. Under **"Build and deployment"**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/docs**
3. Click **Save**

### Step 3: Wait for Deployment

GitHub will build and deploy your site (usually takes 1-2 minutes).

Your site will be live at:
```
https://justinloveless.github.io/github-to-ide
```

## 📝 Customization

### Add Demo Video

Replace the placeholder in `docs/index.html`:

**Current:**
```html
<div class="demo-placeholder">
  🎬 Demo Video Coming Soon
</div>
```

**Option 1 - YouTube:**
```html
<iframe 
  width="100%" 
  height="100%" 
  src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen>
</iframe>
```

**Option 2 - GIF:**
```html
<img src="demo.gif" alt="Demo" style="width: 100%; border-radius: 8px;">
```

**Option 3 - Video File:**
```html
<video controls style="width: 100%; border-radius: 8px;">
  <source src="demo.mp4" type="video/mp4">
</video>
```

### Add Chrome Web Store Link

Once published, update the "Install Extension" button in `docs/index.html`:

```html
<a href="YOUR_CHROME_WEB_STORE_LINK" class="btn btn-primary">
  <span>📦</span>
  <span>Install from Chrome Web Store</span>
</a>
```

### Add Screenshots

1. Create `docs/assets/` folder
2. Add screenshot images
3. Add a screenshots section to `index.html`:

```html
<section class="screenshots">
  <div class="container">
    <h2 class="section-title">See It In Action</h2>
    <div class="screenshots-grid">
      <img src="assets/screenshot1.png" alt="Screenshot 1">
      <img src="assets/screenshot2.png" alt="Screenshot 2">
    </div>
  </div>
</section>
```

### Update Content

Edit `docs/index.html` to customize:
- Hero text and tagline
- Feature descriptions
- Installation instructions
- Footer information

## 🎯 Next Steps

1. **Enable GitHub Pages** (see steps above)
2. **Add demo video or screenshots** to make it more engaging
3. **Update README.md** with link to the site
4. **Share the link** on social media, README badges, etc.

## 📱 Social Media Preview

The site includes Open Graph meta tags for nice previews when shared:
- Twitter
- Facebook
- LinkedIn
- Slack
- Discord

## 🔗 Adding to README

Add a badge and link to your main README.md:

```markdown
## 🌐 Website

Visit our website: [https://justinloveless.github.io/github-to-ide](https://justinloveless.github.io/github-to-ide)

[![Website](https://img.shields.io/badge/website-github--to--ide-blue)](https://justinloveless.github.io/github-to-ide)
```

## 🎨 Future Enhancements

Consider adding:
- [ ] FAQ section
- [ ] User testimonials
- [ ] Changelog/Release notes
- [ ] Dark mode toggle
- [ ] Interactive demo
- [ ] Download statistics
- [ ] Blog section
- [ ] Comparison with alternatives

## 🐛 Testing Locally

Before pushing, test locally:

**Option 1 - Just open the file:**
```bash
open docs/index.html
```

**Option 2 - Local server:**
```bash
cd docs
python3 -m http.server 8000
# Visit http://localhost:8000
```

## 📊 Analytics (Optional)

To track visitors, add Google Analytics:

1. Get your GA4 tracking ID
2. Add to `<head>` in `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 🎉 You're All Set!

Your professional landing page is ready to go. Just enable GitHub Pages and share the link!

---

**Need help?** Check `docs/README.md` for more details.

