# GitHub Pages Site

This directory contains the static site for GitHub to IDE extension.

## Enabling GitHub Pages

1. Go to your repository settings: https://github.com/justinloveless/github-to-ide/settings/pages
2. Under "Build and deployment":
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/docs`
3. Click **Save**
4. Wait a few minutes for GitHub to build and deploy
5. Your site will be live at: `https://justinloveless.github.io/github-to-ide`

## Customization

### Update Content

Edit `index.html` to customize:
- Hero text and taglines
- Feature descriptions
- Installation steps
- Footer links

### Add Demo Video

Replace the demo placeholder:
```html
<div class="demo-placeholder">
  🎬 Demo Video Coming Soon
</div>
```

With an embedded video or GIF:
```html
<video controls>
  <source src="demo.mp4" type="video/mp4">
</video>
```

Or an animated GIF:
```html
<img src="demo.gif" alt="GitHub to IDE Demo">
```

### Add Screenshots

Create an `assets` folder and add screenshots:
```
docs/
  assets/
    screenshot1.png
    screenshot2.png
  index.html
```

Then update the HTML to include them.

### Custom Domain

To use a custom domain:
1. Add a `CNAME` file to this directory with your domain
2. Configure DNS settings at your domain provider
3. GitHub Pages will automatically use your custom domain

## Testing Locally

Open `index.html` in your browser to preview changes before committing.

Or use a local server:
```bash
cd docs
python3 -m http.server 8000
# Visit http://localhost:8000
```

## Features of This Site

- ✅ Modern, clean design
- ✅ Responsive (mobile-friendly)
- ✅ Fast loading (no dependencies)
- ✅ SEO optimized with meta tags
- ✅ Accessible
- ✅ Professional appearance

## Future Enhancements

Consider adding:
- [ ] Demo video/GIF
- [ ] Screenshots gallery
- [ ] Chrome Web Store badge/link
- [ ] Download statistics
- [ ] FAQ section
- [ ] Blog or changelog
- [ ] Dark mode toggle

