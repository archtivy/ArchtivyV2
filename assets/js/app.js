/**
 * Archtivy v2 – main app script
 * Data: data/db.json (projects, products, brands)
 */

(function () {
  'use strict';

  var DB_URL = 'data/db.json';

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search || '');
    return params.get(name);
  }

  function loadDB() {
    return fetch(DB_URL).then(function (res) {
      if (!res.ok) throw new Error('Failed to load db');
      return res.json();
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var str = String(s);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function teamMemberLink(person) {
    if (person.memberProfileUrl) return person.memberProfileUrl;
    var name = encodeURIComponent(person.name || '');
    var role = encodeURIComponent(person.role || '');
    return 'team-profile.html?name=' + name + '&role=' + role;
  }

  function teamMemberMarkup(person) {
    var href = teamMemberLink(person);
    var name = escapeHtml(person.name);
    var role = escapeHtml(person.role);
    return role + ' — <a href="' + escapeHtml(href) + '">' + name + '</a>';
  }

  var categoryLabels = {
    '3d': '3D Model',
    'cad': 'CAD / BIM',
    'catalog': 'Catalog / Spec Sheet',
    'care': 'Installation / Care'
  };

  function renderProject(project, db) {
    var projects = db.projects || [];
    var products = db.products || [];
    var brands = db.brands || [];

    document.title = escapeHtml(project.title) + ' · Archtivy v2';

    var titleEl = document.getElementById('project-title');
    if (titleEl) titleEl.textContent = project.title;

    var metaEl = document.getElementById('project-meta');
    if (metaEl) {
      var cityCountry = [project.city, project.country].filter(Boolean).join(', ');
      var studioLink = project.studioProfileUrl
        ? '<a href="' + escapeHtml(project.studioProfileUrl) + '" class="studio-link">' + escapeHtml(project.studioName || '') + '</a>'
        : escapeHtml(project.studioName || '');
      metaEl.innerHTML = escapeHtml(cityCountry) + ' <span aria-hidden="true">·</span> ' + studioLink;
    }

    var badgesEl = document.getElementById('project-badges');
    if (badgesEl) {
      var nProducts = (project.usedProductIds || []).length;
      var nBrands = (project.brandIds || []).length;
      var nTeam = (project.team || []).length;
      badgesEl.innerHTML =
        '<span>' + nProducts + ' Products</span><span>' + nBrands + ' Brands</span><span>' + nTeam + ' Team</span>';
    }

    var introEl = document.getElementById('project-intro');
    if (introEl && project.description && project.description.length) {
      introEl.innerHTML = project.description.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
    }

    var coverEl = document.getElementById('project-cover');
    if (coverEl) {
      if (project.coverImage) {
        coverEl.innerHTML = '<img src="' + escapeHtml(project.coverImage) + '" alt="" />';
      } else {
        coverEl.innerHTML = '<span>Cover image</span>';
      }
    }

    var galleryEl = document.getElementById('project-gallery');
    if (galleryEl) {
      var images = project.galleryImages && project.galleryImages.length ? project.galleryImages : ['assets/images/placeholder.svg'];
      galleryEl.innerHTML = images
        .map(function (src, i) {
          return (
            '<div class="project-gallery-item" role="listitem" data-lightbox-src="' + escapeHtml(src) + '" tabindex="0"><span>' + (i + 1) + '</span></div>'
          );
        })
        .join('');
    }

    var lightboxProductsEl = document.getElementById('lightbox-products');
    if (lightboxProductsEl) {
      var usedProducts = (project.usedProductIds || [])
        .map(function (id) { return products.find(function (p) { return p.id === id; }); })
        .filter(Boolean);
      lightboxProductsEl.innerHTML = usedProducts
        .map(function (p) {
          var url = 'product.html?id=' + encodeURIComponent(p.id);
          return (
            '<div class="used-product-card">' +
            '<a href="' + url + '">' +
            '<span class="used-product-thumb" aria-hidden="true">Thumb</span>' +
            '<span class="used-product-info">' +
            '<span class="used-product-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="used-product-brand">' + escapeHtml(p.brandName || '') + '</span>' +
            '</span></a></div>'
          );
        })
        .join('');
    }

    var specEl = document.getElementById('project-spec');
    if (specEl) {
      var teamList = (project.team || []).map(function (person) {
        return '<li>' + teamMemberMarkup(person) + '</li>';
      }).join('');
      specEl.innerHTML =
        '<div><dt>Project Type</dt><dd>' + escapeHtml(project.type || '') + '</dd></div>' +
        '<div><dt>Year</dt><dd>' + escapeHtml(String(project.year || '')) + '</dd></div>' +
        '<div><dt>Area</dt><dd>' + escapeHtml(String(project.areaSqft || '')) + ' sqft</dd></div>' +
        '<div><dt>Materials</dt><dd><span class="materials-tags">' +
        (project.materials || []).map(function (m) { return '<span>' + escapeHtml(m) + '</span>'; }).join('') +
        '</span></dd></div>' +
        '<div><dt>Team Members</dt><dd><ul class="team-list">' + teamList + '</ul></dd></div>';
    }

    var usedProductsEl = document.getElementById('project-used-products');
    if (usedProductsEl) {
      var usedProductsList = (project.usedProductIds || [])
        .map(function (id) { return products.find(function (p) { return p.id === id; }); })
        .filter(Boolean);
      usedProductsEl.innerHTML = usedProductsList
        .map(function (p) {
          var url = 'product.html?id=' + encodeURIComponent(p.id);
          return (
            '<article class="product-card">' +
            '<a href="' + url + '">' +
            '<div class="product-card-thumb">Product</div>' +
            '<div class="product-card-body">' +
            '<span class="product-card-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="product-card-brand">' + escapeHtml(p.brandName || '') + '</span>' +
            '</div></a></article>'
          );
        })
        .join('');
    }

    var brandsEl = document.getElementById('project-brands-logos');
    if (brandsEl) {
      var projectBrands = (project.brandIds || [])
        .map(function (id) { return brands.find(function (b) { return b.id === id; }); })
        .filter(Boolean);
      brandsEl.innerHTML = projectBrands
        .map(function (b) {
          return '<div class="brand-logo-placeholder" aria-hidden="true">' + escapeHtml(b.name) + '</div>';
        })
        .join('');
    }

    var nearbyEl = document.getElementById('project-nearby');
    if (nearbyEl) {
      var others = projects.filter(function (p) { return p.id !== project.id; }).slice(0, 6);
      var distances = ['1.2 miles away', '2.3 miles away', '2.8 miles away', '3.1 miles away', '4.0 miles away', '4.5 miles away'];
      nearbyEl.innerHTML = others
        .map(function (p, i) {
          var url = 'project.html?id=' + encodeURIComponent(p.id);
          var city = p.city || '';
          var dist = distances[i] || (i + 1) + ' miles away';
          return (
            '<article class="nearby-card">' +
            '<a href="' + url + '">' +
            '<div class="nearby-card-thumb">Image</div>' +
            '<div class="nearby-card-body">' +
            '<h3 class="nearby-card-title">' + escapeHtml(p.title) + '</h3>' +
            '<p class="nearby-card-meta">' + escapeHtml(city) + ' · ' + dist + '</p>' +
            '</div></a></article>'
          );
        })
        .join('');
    }

    var studioEl = document.getElementById('project-more-studio');
    if (studioEl) {
      var sameStudio = projects.filter(function (p) {
        return p.id !== project.id && p.studioName === project.studioName;
      }).slice(0, 3);
      studioEl.innerHTML = sameStudio
        .map(function (p) {
          var url = 'project.html?id=' + encodeURIComponent(p.id);
          return (
            '<article class="studio-card">' +
            '<a href="' + url + '">' +
            '<div class="studio-card-thumb">Image</div>' +
            '<div class="studio-card-body">' +
            '<h3 class="studio-card-title">' + escapeHtml(p.title) + '</h3>' +
            '</div></a></article>'
          );
        })
        .join('');
    }
  }

  function renderProduct(product, db) {
    var projects = db.projects || [];
    var products = db.products || [];
    var brands = db.brands || [];

    document.title = escapeHtml(product.name) + ' · Archtivy v2';

    var titleEl = document.getElementById('product-title');
    if (titleEl) titleEl.textContent = product.name;

    var brandLinkEl = document.getElementById('product-brand-link');
    if (brandLinkEl) {
      brandLinkEl.href = product.brandProfileUrl || 'profile.html';
      brandLinkEl.textContent = product.brandName || '';
    }

    var badgesEl = document.getElementById('product-badges');
    if (badgesEl) {
      var nProjects = (product.usedInProjectIds || []).length;
      var nColors = (product.colorOptions || []).length;
      var materialsStr = (product.materials || []).join(', ');
      badgesEl.innerHTML =
        '<span>Used in ' + nProjects + ' projects</span>' +
        '<span>' + nColors + ' colors</span>' +
        (materialsStr ? '<span>' + escapeHtml(materialsStr) + '</span>' : '');
    }

    var heroImgEl = document.getElementById('product-hero-image');
    if (heroImgEl) {
      if (product.heroImage) {
        heroImgEl.innerHTML = '<img src="' + escapeHtml(product.heroImage) + '" alt="" />';
      } else {
        heroImgEl.innerHTML = '<span>Product image</span>';
      }
    }

    var descEl = document.getElementById('product-description');
    if (descEl && product.description && product.description.length) {
      descEl.innerHTML = product.description.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
    }

    var galleryEl = document.getElementById('product-gallery');
    if (galleryEl) {
      var images = product.galleryImages && product.galleryImages.length ? product.galleryImages : ['assets/images/placeholder.svg'];
      galleryEl.innerHTML = images
        .map(function (src, i) {
          return (
            '<div class="product-gallery-item" role="listitem" data-lightbox-src="' + escapeHtml(src) + '" data-index="' + i + '" tabindex="0"><span>' + (i + 1) + '</span></div>'
          );
        })
        .join('');
    }

    var lightboxTitleEl = document.getElementById('product-lightbox-title');
    if (lightboxTitleEl) lightboxTitleEl.textContent = product.name;
    var lightboxBrandEl = document.getElementById('product-lightbox-brand');
    if (lightboxBrandEl) {
      lightboxBrandEl.href = product.brandProfileUrl || 'profile.html';
      lightboxBrandEl.textContent = product.brandName || '';
    }

    var lightboxTeamEl = document.getElementById('product-lightbox-team');
    if (lightboxTeamEl) {
      var team = (product.team || []).slice(0, 3);
      lightboxTeamEl.innerHTML = team.map(function (person) {
        return '<li>' + teamMemberMarkup(person) + '</li>';
      }).join('');
    }

    var lightboxQuickFilesEl = document.getElementById('product-lightbox-quick-files');
    if (lightboxQuickFilesEl && product.files && product.files.length) {
      var byCat = { '3d': [], 'cad': [], 'catalog': [] };
      product.files.forEach(function (f) {
        var c = f.category || 'catalog';
        if (byCat[c] && byCat[c].length < 1) byCat[c].push(f);
      });
      var quick = (byCat['3d'] || []).concat(byCat['cad'] || []).concat(byCat['catalog'] || []).slice(0, 3);
      lightboxQuickFilesEl.innerHTML = quick
        .map(function (f) {
          return (
            '<li class="lightbox-quick-file">' +
            '<span class="file-type-badge">' + escapeHtml(f.type) + '</span>' +
            '<span>' + escapeHtml(f.filename) + '</span>' +
            '<span class="file-size">' + escapeHtml(f.size) + '</span>' +
            '<a href="#" class="btn btn-secondary file-download">Download</a></li>'
          );
        })
        .join('');
    }

    var lightboxProjectsEl = document.getElementById('product-lightbox-projects');
    if (lightboxProjectsEl) {
      var usedProjs = (product.usedInProjectIds || [])
        .map(function (id) { return projects.find(function (p) { return p.id === id; }); })
        .filter(Boolean)
        .slice(0, 3);
      var dists = ['1.2 mi', '2.3 mi', '2.8 mi'];
      lightboxProjectsEl.innerHTML = usedProjs
        .map(function (p, i) {
          var url = 'project.html?id=' + encodeURIComponent(p.id);
          return (
            '<li><a href="' + url + '">' + escapeHtml(p.title) + '</a> · ' + escapeHtml(p.city || '') + ' · ' + (dists[i] || '') + '</li>'
          );
        })
        .join('');
    }

    var productTeamEl = document.getElementById('product-team-list');
    if (productTeamEl) {
      productTeamEl.innerHTML = (product.team || []).map(function (person) {
        return '<li>' + teamMemberMarkup(person) + '</li>';
      }).join('');
    }

    var usedProjectsEl = document.getElementById('product-used-projects');
    if (usedProjectsEl) {
      var usedProjsList = (product.usedInProjectIds || [])
        .map(function (id) { return projects.find(function (p) { return p.id === id; }); })
        .filter(Boolean);
      usedProjectsEl.innerHTML = usedProjsList
        .map(function (p) {
          var url = 'project.html?id=' + encodeURIComponent(p.id);
          return (
            '<article class="nearby-card">' +
            '<a href="' + url + '">' +
            '<div class="nearby-card-thumb">Image</div>' +
            '<div class="nearby-card-body">' +
            '<h3 class="nearby-card-title">' + escapeHtml(p.title) + '</h3>' +
            '<p class="nearby-card-meta">' + escapeHtml(p.city || '') + '</p>' +
            '</div></a></article>'
          );
        })
        .join('');
    }

    var specEl = document.getElementById('product-spec');
    if (specEl) {
      var colorTags = (product.colorOptions || []).map(function (c) { return '<span>' + escapeHtml(c) + '</span>'; }).join('');
      specEl.innerHTML =
        '<div><dt>Product Type</dt><dd>' + escapeHtml(product.productType || '') + '</dd></div>' +
        '<div><dt>Materials</dt><dd>' + escapeHtml((product.materials || []).join(', ')) + '</dd></div>' +
        '<div><dt>Color options</dt><dd><span class="color-tags">' + colorTags + '</span></dd></div>' +
        '<div><dt>Year</dt><dd>' + escapeHtml(String(product.year || '')) + '</dd></div>' +
        '<div><dt>Custom order</dt><dd>' + (product.customOrder ? 'Yes' : 'No') + '</dd></div>';
    }

    var filesEl = document.getElementById('product-files');
    var isMember = getQueryParam('user') === 'member';
    if (filesEl && product.files && product.files.length) {
      var byCategory = {};
      product.files.forEach(function (f) {
        var cat = f.category || 'catalog';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(f);
      });
      var order = ['3d', 'cad', 'catalog', 'care'];
      var html = '';
      order.forEach(function (cat) {
        var list = byCategory[cat];
        if (!list || !list.length) return;
        var label = categoryLabels[cat] || cat;
        html += '<div class="files-category">';
        html += '<h3 class="files-category-title">' + escapeHtml(label) + '</h3>';
        html += '<ul class="files-list">';
        list.forEach(function (f) {
          var downloadBtn = isMember
            ? '<a href="#" class="btn btn-secondary file-download">Download</a>'
            : '<span class="download-locked" aria-disabled="true">Sign in to download</span>';
          html +=
            '<li class="file-item">' +
            '<span class="file-name">' + escapeHtml(f.filename) + '</span>' +
            '<span class="file-type-badge">' + escapeHtml(f.type) + '</span>' +
            '<span class="file-size">' + escapeHtml(f.size) + '</span>' +
            downloadBtn + '</li>';
        });
        html += '</ul></div>';
      });
      if (!isMember) html += '<p class="files-gate-note">Sign in to download files.</p>';
      filesEl.innerHTML = html;
    }

    var moreBrandEl = document.getElementById('product-more-brand');
    if (moreBrandEl) {
      var sameBrand = products.filter(function (p) {
        return p.id !== product.id && p.brandName === product.brandName;
      }).slice(0, 3);
      moreBrandEl.innerHTML = sameBrand
        .map(function (p) {
          var url = 'product.html?id=' + encodeURIComponent(p.id);
          return (
            '<article class="product-card">' +
            '<a href="' + url + '">' +
            '<div class="product-card-thumb">Product</div>' +
            '<div class="product-card-body">' +
            '<span class="product-card-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="product-card-brand">' + escapeHtml(p.brandName || '') + '</span>' +
            '</div></a></article>'
          );
        })
        .join('');
    }

    var relatedEl = document.getElementById('product-related');
    if (relatedEl) {
      var related = products.filter(function (p) { return p.id !== product.id; }).slice(0, 6);
      relatedEl.innerHTML = related
        .map(function (p) {
          var url = 'product.html?id=' + encodeURIComponent(p.id);
          return (
            '<article class="product-card">' +
            '<a href="' + url + '">' +
            '<div class="product-card-thumb">Product</div>' +
            '<div class="product-card-body">' +
            '<span class="product-card-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="product-card-brand">' + escapeHtml(p.brandName || '') + '</span>' +
            '</div></a></article>'
          );
        })
        .join('');
    }

    var counterEl = document.getElementById('product-lightbox-counter');
    if (counterEl) {
      var n = (product.galleryImages || []).length || 1;
      counterEl.textContent = '1 / ' + n;
    }
  }

  // ---------- Lightbox (project page) ----------
  function initLightbox() {
    var lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;

    var lightboxImage = document.getElementById('lightbox-image');
    var closeBtn = document.getElementById('lightbox-close');
    var galleryItems = document.querySelectorAll('.project-gallery-item[data-lightbox-src]');

    function openLightbox(src) {
      if (lightboxImage && src) lightboxImage.src = src;
      lightbox.classList.add('is-open');
      lightbox.removeAttribute('hidden');
      if (closeBtn) closeBtn.focus();
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }

    function handleGalleryClick(e) {
      var item = e.currentTarget;
      var src = item.getAttribute('data-lightbox-src');
      if (src) openLightbox(src);
    }

    function handleGalleryKeydown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleGalleryClick(e);
      }
    }

    galleryItems.forEach(function (item) {
      item.addEventListener('click', handleGalleryClick);
      item.addEventListener('keydown', handleGalleryKeydown);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  }

  // ---------- Product lightbox ----------
  function initProductLightbox() {
    var lightbox = document.getElementById('product-lightbox');
    if (!lightbox) return;

    var imageEl = document.getElementById('product-lightbox-image');
    var closeBtn = document.getElementById('product-lightbox-close');
    var prevBtn = document.getElementById('product-lightbox-prev');
    var nextBtn = document.getElementById('product-lightbox-next');
    var counterEl = document.getElementById('product-lightbox-counter');
    var galleryItems = document.querySelectorAll('.product-gallery-item[data-lightbox-src]');
    var srcs = [];
    galleryItems.forEach(function (item) {
      var src = item.getAttribute('data-lightbox-src');
      if (src) srcs.push(src);
    });
    var total = srcs.length || 1;
    var currentIndex = 0;

    function openLightbox(index) {
      currentIndex = Math.max(0, Math.min(index, total - 1));
      if (imageEl && srcs[currentIndex]) imageEl.src = srcs[currentIndex];
      if (counterEl) counterEl.textContent = (currentIndex + 1) + ' / ' + total;
      lightbox.classList.add('is-open');
      lightbox.removeAttribute('hidden');
      if (closeBtn) closeBtn.focus();
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }

    function goPrev() {
      if (currentIndex > 0) openLightbox(currentIndex - 1);
    }

    function goNext() {
      if (currentIndex < total - 1) openLightbox(currentIndex + 1);
    }

    galleryItems.forEach(function (item, i) {
      item.addEventListener('click', function () { openLightbox(i); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(i);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', goPrev);
    if (nextBtn) nextBtn.addEventListener('click', goNext);

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    });

    var scrollFiles = lightbox.querySelector('.lightbox-scroll-files');
    var scrollProjects = lightbox.querySelector('.lightbox-scroll-projects');
    if (scrollFiles) {
      scrollFiles.addEventListener('click', function (e) {
        e.preventDefault();
        closeLightbox();
        var target = document.getElementById('files-heading');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (scrollProjects) {
      scrollProjects.addEventListener('click', function (e) {
        e.preventDefault();
        closeLightbox();
        var target = document.getElementById('used-projects-heading');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  var BANNER_STORAGE_KEY = 'archtivyBannerClosedUntil';
  var BANNER_HIDE_DAYS = 7;

  function initPreviewBanner() {
    try {
      var closedUntil = parseInt(localStorage.getItem(BANNER_STORAGE_KEY), 10);
      if (closedUntil && Date.now() < closedUntil) return;
    } catch (e) {}

    var banner = document.getElementById('preview-banner');
    if (banner) return;

    banner = document.createElement('div');
    banner.id = 'preview-banner';
    banner.className = 'preview-banner';
    banner.setAttribute('role', 'banner');
    banner.setAttribute('aria-label', 'Preview notice');
    banner.innerHTML =
      '<div class="preview-banner-inner">' +
      '<span class="preview-banner-text">Archtivy v2 is in preview — some pages may change.</span>' +
      '<span class="preview-banner-pill" aria-hidden="true">BETA</span>' +
      '<button type="button" class="preview-banner-close" aria-label="Dismiss">&times;</button>' +
      '</div>';

    var closeBtn = banner.querySelector('.preview-banner-close');
    function closeBanner() {
      banner.classList.add('is-closing');
      banner.addEventListener('transitionend', function onEnd() {
        banner.removeEventListener('transitionend', onEnd);
        banner.remove();
        try {
          localStorage.setItem(BANNER_STORAGE_KEY, String(Date.now() + BANNER_HIDE_DAYS * 24 * 60 * 60 * 1000));
        } catch (e) {}
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeBanner);

    document.body.insertBefore(banner, document.body.firstChild);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add('is-visible');
      });
    });
  }

  function runInit() {
    initPreviewBanner();
    initLightbox();
    initProductLightbox();
    initMembershipUI();
    console.log('Archtivy v2 loaded');
  }

  function createSignInModal() {
    var overlay = document.getElementById('sign-in-modal-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'sign-in-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Sign in');
    overlay.innerHTML =
      '<div class="modal">' +
      '<button type="button" class="modal-close" id="sign-in-modal-close" aria-label="Close">&times;</button>' +
      '<h2>Sign in</h2>' +
      '<div class="modal-field">' +
      '<label for="sign-in-email">Email</label>' +
      '<input type="email" id="sign-in-email" placeholder="you@example.com" autocomplete="email" />' +
      '</div>' +
      '<p class="modal-helper">Demo mode — no email is sent yet.</p>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn" id="sign-in-magic-link-btn">Send magic link</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function openSignInModal() {
    var overlay = createSignInModal();
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var input = document.getElementById('sign-in-email');
    if (input) setTimeout(function () { input.focus(); }, 100);
  }

  function closeSignInModal() {
    var overlay = document.getElementById('sign-in-modal-overlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  function initMembershipUI() {
    var actions = document.querySelector('.header-actions');
    if (!actions) return;

    var isMember = getQueryParam('user') === 'member';
    if (isMember) actions.classList.add('is-member'); else actions.classList.remove('is-member');

    var signInBtn = document.getElementById('header-sign-in');
    if (signInBtn) {
      signInBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openSignInModal();
      });
    }

    var signOutLink = document.getElementById('header-sign-out');
    if (signOutLink) {
      signOutLink.addEventListener('click', function (e) {
        e.preventDefault();
        var url = window.location.pathname + window.location.search;
        var params = new URLSearchParams(window.location.search);
        params.delete('user');
        var q = params.toString();
        window.location.href = window.location.pathname + (q ? '?' + q : '');
      });
    }

    var modal = createSignInModal();
    var closeBtn = document.getElementById('sign-in-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSignInModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeSignInModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSignInModal();
    });

    var magicBtn = document.getElementById('sign-in-magic-link-btn');
    if (magicBtn) {
      magicBtn.addEventListener('click', function () {
        closeSignInModal();
      });
    }

    var claimBtn = document.getElementById('claim-profile-btn');
    if (claimBtn) {
      claimBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openSignInModal();
      });
    }
  }

  function renderProjectsGrid(projects, container) {
    if (!container) return;
    if (!projects || !projects.length) {
      container.innerHTML = '<p class="explore-empty">No projects match the filters.</p>';
      return;
    }
    container.innerHTML = projects.map(function (p) {
      var url = 'project.html?id=' + encodeURIComponent(p.id);
      var cityCountry = [p.city, p.country].filter(Boolean).join(', ');
      var nProducts = (p.usedProductIds || []).length;
      var nBrands = (p.brandIds || []).length;
      var nTeam = (p.team || []).length;
      var cover = p.coverImage
        ? '<img src="' + escapeHtml(p.coverImage) + '" alt="" />'
        : '<span>Cover</span>';
      return (
        '<article class="explore-project-card">' +
        '<a href="' + url + '">' +
        '<div class="explore-project-card-cover">' + cover + '</div>' +
        '<div class="explore-project-card-body">' +
        '<h3 class="explore-project-card-title">' + escapeHtml(p.title) + '</h3>' +
        '<p class="explore-project-card-meta">' + escapeHtml(cityCountry) + (p.year ? ' · ' + escapeHtml(String(p.year)) : '') + '</p>' +
        '<div class="explore-project-card-badges">' +
        '<span>' + nProducts + ' Products</span><span>' + nBrands + ' Brands</span><span>' + nTeam + ' Team</span>' +
        '</div></div></a></article>'
      );
    }).join('');
  }

  function renderProductsGrid(products, container) {
    if (!container) return;
    if (!products || !products.length) {
      container.innerHTML = '<p class="explore-empty">No products match the filters.</p>';
      return;
    }
    container.innerHTML = products.map(function (p) {
      var url = 'product.html?id=' + encodeURIComponent(p.id);
      var nProjects = (p.usedInProjectIds || []).length;
      var nColors = (p.colorOptions || []).length;
      var materialsStr = (p.materials || []).slice(0, 2).join(', ');
      var thumb = p.heroImage
        ? '<img src="' + escapeHtml(p.heroImage) + '" alt="" />'
        : '<span>Product</span>';
      return (
        '<article class="explore-product-card">' +
        '<a href="' + url + '">' +
        '<div class="explore-product-card-thumb">' + thumb + '</div>' +
        '<div class="explore-product-card-body">' +
        '<span class="explore-product-card-name">' + escapeHtml(p.name) + '</span>' +
        '<p class="explore-product-card-brand">' + escapeHtml(p.brandName || '') + '</p>' +
        '<div class="explore-product-card-badges">' +
        '<span>Used in ' + nProjects + ' projects</span>' +
        (nColors ? '<span>' + nColors + ' colors</span>' : '') +
        (materialsStr ? '<span>' + escapeHtml(materialsStr) + '</span>' : '') +
        '</div></div></a></article>'
      );
    }).join('');
  }

  function initProjectsExplorePage() {
    var gridEl = document.getElementById('explore-projects-grid');
    var searchEl = document.getElementById('explore-projects-search');
    var typeEl = document.getElementById('explore-projects-type');
    if (!gridEl) return;

    loadDB().then(function (db) {
      var projects = db.projects || [];
      var types = [];
      projects.forEach(function (p) {
        if (p.type && types.indexOf(p.type) === -1) types.push(p.type);
      });
      types.sort();

      if (typeEl) {
        typeEl.innerHTML = '<option value="">All types</option>' + types.map(function (t) {
          return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
        }).join('');
      }

      function filterAndRender() {
        var q = (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
        var typeVal = (typeEl && typeEl.value) ? typeEl.value : '';
        var filtered = projects.filter(function (p) {
          var matchSearch = !q || (p.title && p.title.toLowerCase().indexOf(q) !== -1) ||
            (p.city && p.city.toLowerCase().indexOf(q) !== -1) ||
            (p.country && p.country.toLowerCase().indexOf(q) !== -1);
          var matchType = !typeVal || p.type === typeVal;
          return matchSearch && matchType;
        });
        renderProjectsGrid(filtered, gridEl);
      }

      filterAndRender();
      if (searchEl) searchEl.addEventListener('input', filterAndRender);
      if (searchEl) searchEl.addEventListener('change', filterAndRender);
      if (typeEl) typeEl.addEventListener('change', filterAndRender);
    }).catch(function (err) {
      console.error(err);
      gridEl.innerHTML = '<p class="explore-empty">Failed to load projects.</p>';
    });
  }

  function initProductsExplorePage() {
    var gridEl = document.getElementById('explore-products-grid');
    var searchEl = document.getElementById('explore-products-search');
    var materialEl = document.getElementById('explore-products-material');
    if (!gridEl) return;

    loadDB().then(function (db) {
      var products = db.products || [];
      var materialsSet = {};
      products.forEach(function (p) {
        (p.materials || []).forEach(function (m) {
          if (m) materialsSet[m] = true;
        });
      });
      var materials = Object.keys(materialsSet).sort();

      if (materialEl) {
        materialEl.innerHTML = '<option value="">All materials</option>' + materials.map(function (m) {
          return '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>';
        }).join('');
      }

      function filterAndRender() {
        var q = (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
        var matVal = (materialEl && materialEl.value) ? materialEl.value : '';
        var filtered = products.filter(function (p) {
          var matchSearch = !q ||
            (p.name && p.name.toLowerCase().indexOf(q) !== -1) ||
            (p.brandName && p.brandName.toLowerCase().indexOf(q) !== -1);
          var matchMat = !matVal || (p.materials && p.materials.indexOf(matVal) !== -1);
          return matchSearch && matchMat;
        });
        renderProductsGrid(filtered, gridEl);
      }

      filterAndRender();
      if (searchEl) searchEl.addEventListener('input', filterAndRender);
      if (searchEl) searchEl.addEventListener('change', filterAndRender);
      if (materialEl) materialEl.addEventListener('change', filterAndRender);
    }).catch(function (err) {
      console.error(err);
      gridEl.innerHTML = '<p class="explore-empty">Failed to load products.</p>';
    });
  }

  function init() {
    initPreviewBanner();

    var path = window.location.pathname || '';
    var isProjectDetail = path.indexOf('project.html') !== -1;
    var isProductDetail = path.indexOf('product.html') !== -1;
    var isProjectsExplore = path.indexOf('projects.html') !== -1;
    var isProductsExplore = path.indexOf('products.html') !== -1;

    if (isProjectsExplore) {
      initProjectsExplorePage();
      initMembershipUI();
      return;
    }

    if (isProductsExplore) {
      initProductsExplorePage();
      initMembershipUI();
      return;
    }

    if (isProjectDetail) {
      loadDB().then(function (db) {
        var id = getQueryParam('id') || (db.projects && db.projects[0] && db.projects[0].id);
        var project = db.projects && db.projects.find(function (p) { return p.id === id; });
        if (project) renderProject(project, db);
        runInit();
      }).catch(function (err) {
        console.error(err);
        runInit();
      });
      return;
    }

    if (isProductDetail) {
      loadDB().then(function (db) {
        var id = getQueryParam('id') || (db.products && db.products[0] && db.products[0].id);
        var product = db.products && db.products.find(function (p) { return p.id === id; });
        if (product) renderProduct(product, db);
        runInit();
      }).catch(function (err) {
        console.error(err);
        runInit();
      });
      return;
    }

    runInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
