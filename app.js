(function () {
  'use strict';

  const properties = Array.isArray(window.PROPERTIES) ? window.PROPERTIES : [];
  const numberFormat = new Intl.NumberFormat('ar-SA');
  const format = (value) => numberFormat.format(value);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const normalize = (value) => String(value || '').trim().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[\u064B-\u065F]/g, '').toLocaleLowerCase('ar');
  const icons = {
    pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    area: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v4M13 4v3M20 8h-4M20 13h-3M4 16h4M8 20v-4"/>',
    bed: '<path d="M3 18v3M21 18v3M3 12h18v6H3zM5 12V5h14v7M8 9h3v3H8zM13 9h3v3h-3z"/>',
    bath: '<path d="M3 12h18M5 12V6a3 3 0 0 1 6 0M4 12v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4M7 20v2M17 20v2M8 6h6"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
  };
  const icon = (name) => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.home}</svg>`;

  const searchForm = $('#searchForm');
  const grid = $('#propertyGrid');
  const favorites = new Set();
  const propertyStatus = new Map(properties.map((property) => [property.id, 'available']));
  const dialogTriggers = new WeakMap();
  let currentResults = properties.slice();
  let latestInterestProperty = null;

  function field(name) {
    return searchForm ? searchForm.elements.namedItem(name) : null;
  }

  function setField(name, value) {
    const input = field(name);
    if (input) input.value = value;
  }

  function priceLabel(property) {
    return `${format(property.price)} <span class="currency">ر.س${property.purpose === 'إيجار' ? ' <span class="price-period">/ سنوياً</span>' : ''}</span>`;
  }

  function roomsLabel(property) {
    return property.rooms === null ? 'غير منطبق' : `${format(property.rooms)} غرف`;
  }

  function renderCard(property, index) {
    const id = escapeHTML(property.id);
    const favorite = favorites.has(property.id);
    return `<article class="property-card" data-property-id="${id}">
      <div class="property-image">
        <img src="${escapeHTML(property.image)}" alt="صورة توضيحية لـ${escapeHTML(property.title)}؛ لا تمثل عرضاً فعلياً" loading="${index < 3 ? 'eager' : 'lazy'}" width="640" height="450">
        <div class="property-badges"><span class="badge badge-purpose">لل${property.purpose === 'بيع' ? 'بيع' : 'إيجار'}</span>${property.featured ? '<span class="badge badge-featured">مختار لك</span>' : ''}</div>
        <button class="favorite-btn${favorite ? ' is-favorite' : ''}" type="button" data-favorite="${id}" aria-label="${favorite ? 'إزالة' : 'إضافة'} ${escapeHTML(property.title)} ${favorite ? 'من' : 'إلى'} المفضلة التجريبية" aria-pressed="${favorite}">${icon('heart')}</button>
        <span class="image-caption">صورة توضيحية</span>
      </div>
      <div class="property-body">
        <div class="property-meta"><span class="property-type">${escapeHTML(property.type)}</span><span class="property-location">${icon('pin')}${escapeHTML(property.city)}</span></div>
        <h3>${escapeHTML(property.title)}</h3>
        <div class="property-features"><span>${icon('area')}${format(property.area)} م²</span><span>${icon('bed')}${roomsLabel(property)}</span></div>
        <div class="property-bottom"><p class="property-price">${priceLabel(property)}</p><button class="details-btn" type="button" data-details="${id}">التفاصيل ${icon('arrow')}</button></div>
        <p class="card-demo-note">بيانات تجريبية للعرض</p>
      </div>
    </article>`;
  }

  function renderProperties() {
    if (!grid) return;
    const order = $('#sortProperties')?.value || 'featured';
    const sorted = currentResults.slice();
    if (order === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (order === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    grid.innerHTML = sorted.length
      ? sorted.map(renderCard).join('')
      : `<div class="empty-state">${icon('search')}<h3>لم نجد عقاراً يطابق اختيارك</h3><p>جرّب مدينة أخرى أو وسّع نطاق السعر لاستكشاف البيانات التجريبية.</p><button type="button" class="button button-gold" data-reset-filters>عرض جميع العقارات</button></div>`;
    const count = $('#resultCount');
    if (count) count.textContent = `${format(sorted.length)} ${sorted.length === 1 ? 'عقار تجريبي' : 'عقارات تجريبية'}`;
  }

  function updatePurposeTabs() {
    const purpose = field('purpose')?.value || '';
    $$('[data-purpose]').forEach((button) => {
      const active = button.dataset.purpose === purpose;
      button.classList.toggle('is-active', active);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const selectedType = field('type')?.value || '';
    $$('[data-category]').forEach((button) => {
      const active = categoryType(button.dataset.category) === selectedType;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function goToProperties() {
    const target = $('#properties') || grid;
    target?.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth', block: 'start' });
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function applyFilters(scroll = false) {
    const keyword = normalize(field('keyword')?.value);
    const city = field('city')?.value || '';
    const type = field('type')?.value || '';
    const purpose = field('purpose')?.value || '';
    const min = Number(field('minPrice')?.value || 0);
    const maxInput = field('maxPrice');
    const max = maxInput?.value === '' || !maxInput ? Infinity : Number(maxInput.value);
    maxInput?.setCustomValidity('');
    if (min > max) {
      maxInput?.setCustomValidity('الحد الأعلى للسعر يجب أن يكون أكبر من أو مساوياً للحد الأدنى.');
      maxInput?.reportValidity();
      return;
    }
    currentResults = properties.filter((property) => {
      const text = normalize(`${property.title} ${property.type} ${property.city} ${property.purpose}`);
      return propertyStatus.get(property.id) === 'available'
        && (!keyword || text.includes(keyword))
        && (!city || property.city === city)
        && (!type || property.type === type)
        && (!purpose || property.purpose === purpose)
        && property.price >= min
        && property.price <= max;
    });
    updatePurposeTabs();
    renderProperties();
    if (scroll) goToProperties();
  }

  function resetFilters(scroll = true) {
    searchForm?.reset();
    ['keyword', 'city', 'type', 'purpose', 'minPrice', 'maxPrice'].forEach((name) => setField(name, ''));
    field('maxPrice')?.setCustomValidity('');
    const sort = $('#sortProperties');
    if (sort) sort.value = 'featured';
    applyFilters(scroll);
  }

  function categoryType(type) {
    return ({ 'فلل': 'فيلا', 'شقق': 'شقة', 'أراضٍ': 'أرض', 'أراضي': 'أرض', 'عقارات تجارية': 'تجاري' })[type] || type;
  }

  function openDialog(dialog, trigger) {
    if (!dialog) return;
    dialogTriggers.set(dialog, trigger || document.activeElement);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('has-dialog');
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
  }

  function openDetails(id, trigger) {
    const property = properties.find((item) => item.id === id);
    const content = $('#propertyDialogContent');
    if (!property || !content) return;
    const gallery = property.gallery || [property.image];
    content.innerHTML = `<div class="property-detail">
      <div class="detail-heading"><div><p class="eyebrow">${escapeHTML(property.type)} · ${escapeHTML(property.city)} · لل${property.purpose === 'بيع' ? 'بيع' : 'إيجار'}</p><h2 id="propertyDialogTitle">${escapeHTML(property.title)}</h2></div><span class="demo-label">بيانات تجريبية للعرض</span></div>
      <div class="detail-gallery"><img class="detail-main-image" id="detailMainImage" src="${escapeHTML(gallery[0])}" alt="صورة توضيحية ${format(1)} لـ${escapeHTML(property.title)}" width="1100" height="650"><span class="gallery-image-note">الصور توضيحية ولا تمثل عقاراً متاحاً</span></div>
      <div class="gallery-thumbs" role="group" aria-label="صور العقار التوضيحية">${gallery.map((src, index) => `<button type="button" class="gallery-thumb${index === 0 ? ' is-active' : ''}" data-gallery-src="${escapeHTML(src)}" data-gallery-index="${index}" data-gallery-title="${escapeHTML(property.title)}" aria-label="عرض الصورة التوضيحية ${format(index + 1)}" aria-pressed="${index === 0}"><img src="${escapeHTML(src)}" alt="" width="150" height="100"></button>`).join('')}</div>
      <div class="detail-layout"><div class="detail-description"><h3>عن هذا العقار</h3><p>${escapeHTML(property.description)}</p>
        <div class="detail-specs"><div>${icon('area')}<span>المساحة<strong>${format(property.area)} م²</strong></span></div><div>${icon('bed')}<span>الغرف<strong>${roomsLabel(property)}</strong></span></div><div>${icon('bath')}<span>دورات المياه<strong>${property.bathrooms === null ? 'غير منطبق' : format(property.bathrooms)}</strong></span></div><div>${icon('home')}<span>نوع العقار<strong>${escapeHTML(property.type)}</strong></span></div></div>
        <h3>الموقع التوضيحي</h3><div class="demo-map" aria-label="رسم موقع تجريبي لا يمثل عنواناً فعلياً"><span class="map-road map-road-one"></span><span class="map-road map-road-two"></span><span class="map-road map-road-three"></span><span class="map-marker">${icon('pin')}</span><span class="map-label">${escapeHTML(property.city)} · موقع تجريبي</span></div><p class="demo-map-note">موقع توضيحي — لا يمثل عنواناً فعلياً. اسم المدينة مستخدم لتجربة التصفية فقط.</p>
      </div><aside class="detail-summary"><span class="summary-label">سعر تجريبي ${property.purpose === 'إيجار' ? 'للإيجار السنوي' : 'للبيع'}</span><p class="detail-price">${priceLabel(property)}</p><p>يمكنك تجربة رحلة الاستفسار عن العقار عبر نموذج الاهتمام.</p><button type="button" class="button button-gold" data-inquire="${escapeHTML(property.id)}">استفسر عن هذا العقار ${icon('arrow')}</button><p class="summary-note">تجربة عرض فقط؛ لا يتم إرسال أي طلب.</p></aside></div>
    </div>`;
    const dialog = $('#propertyDialog');
    dialog?.setAttribute('aria-labelledby', 'propertyDialogTitle');
    openDialog(dialog, trigger);
  }

  function setInterestProperty(id) {
    const property = properties.find((item) => item.id === id);
    const form = $('#interestForm');
    if (!property || !form) return;
    latestInterestProperty = property;
    const interest = form.elements.namedItem('interest');
    if (interest && interest.tagName === 'SELECT') {
      const possible = property.purpose === 'إيجار' ? ['استفسار عن عقار', 'استئجار عقار', 'استئجار'] : ['استفسار عن عقار', 'شراء عقار', 'شراء'];
      const match = Array.from(interest.options).find((option) => option.value && (possible.includes(option.value) || possible.includes(option.textContent.trim())));
      if (match) interest.value = match.value;
    } else if (interest) interest.value = 'استفسار عن عقار';
    const message = form.elements.namedItem('message');
    if (message) message.value = `أرغب بالاستفسار عن «${property.title}» في ${property.city} (بيانات تجريبية للعرض).`;
    $$('dialog[open]').reverse().forEach(closeDialog);
    const contact = $('#contact') || form;
    contact.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth', block: 'start' });
    window.setTimeout(() => form.elements.namedItem('fullName')?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 300);
  }

  function renderDashboard() {
    const content = $('#dashboardContent');
    if (!content) return;
    const available = properties.filter((item) => propertyStatus.get(item.id) === 'available').length;
    content.innerHTML = `<div class="dashboard-heading"><div><p class="eyebrow">مساحة الإدارة</p><h2 id="dashboardDialogTitle">لوحة التحكم التجريبية</h2></div><button class="button button-gold" type="button" data-add-property>+ إضافة عقار</button></div>
      <p class="dashboard-notice">تصوّر لإدارة العقارات — بيانات تجريبية للعرض. لا يوجد تسجيل دخول أو نظام خلفي أو تخزين للبيانات. تغييرات الحالة مؤقتة لهذه الجلسة وتُعاد عند تحديث الصفحة.</p>
      <div class="dashboard-summary"><div><span>إجمالي العقارات</span><strong>${format(properties.length)}</strong></div><div><span>معروض</span><strong>${format(available)}</strong></div><div><span>مسودة</span><strong>${format(properties.length - available)}</strong></div></div>
      <p id="dashboardStatus" class="form-status" role="status" aria-live="polite"></p>
      <div class="dashboard-table-wrap"><table class="dashboard-table"><caption class="sr-only">قائمة العقارات التجريبية وحالة كل عرض</caption><thead><tr><th scope="col">العقار</th><th scope="col">المدينة</th><th scope="col">الغرض</th><th scope="col">السعر التجريبي</th><th scope="col">حالة العرض</th><th scope="col">معاينة</th></tr></thead><tbody>${properties.map((property) => `<tr><td><div class="dashboard-property"><img src="${escapeHTML(property.image)}" alt="" width="64" height="50"><span>${escapeHTML(property.title)}<small>${escapeHTML(property.type)} · ${format(property.area)} م²</small></span></div></td><td>${escapeHTML(property.city)}</td><td>لل${property.purpose === 'بيع' ? 'بيع' : 'إيجار'}</td><td>${priceLabel(property)}</td><td><select class="status-select" data-property-status="${escapeHTML(property.id)}" aria-label="حالة عرض ${escapeHTML(property.title)}"><option value="available"${propertyStatus.get(property.id) === 'available' ? ' selected' : ''}>معروض</option><option value="draft"${propertyStatus.get(property.id) === 'draft' ? ' selected' : ''}>مسودة</option></select></td><td><button class="text-btn" type="button" data-details="${escapeHTML(property.id)}">التفاصيل</button></td></tr>`).join('')}</tbody></table></div>
      <p class="dashboard-footnote">تغيير العرض إلى «مسودة» يخفيه من نتائج البحث في هذه الجلسة فقط.</p>`;
    $('#dashboardDialog')?.setAttribute('aria-labelledby', 'dashboardDialogTitle');
  }

  function closeMobileMenu() {
    $('#menuToggle')?.setAttribute('aria-expanded', 'false');
    $('#menuToggle')?.setAttribute('aria-label', 'فتح القائمة');
    $('#mainNav')?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, a');
    if (!button) return;
    if (button.matches('[data-details]')) {
      event.preventDefault();
      openDetails(button.dataset.details, button);
    } else if (button.matches('[data-favorite]')) {
      const id = button.dataset.favorite;
      favorites.has(id) ? favorites.delete(id) : favorites.add(id);
      const selected = favorites.has(id);
      const property = properties.find((item) => item.id === id);
      button.classList.toggle('is-favorite', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${selected ? 'إزالة' : 'إضافة'} ${property?.title || 'العقار'} ${selected ? 'من' : 'إلى'} المفضلة التجريبية`);
    } else if (button.matches('[data-purpose]')) {
      setField('purpose', button.dataset.purpose || '');
      updatePurposeTabs();
    } else if (button.matches('[data-category]')) {
      event.preventDefault();
      resetFilters(false);
      setField('type', categoryType(button.dataset.category));
      applyFilters(true);
    } else if (button.matches('#clearFilters, #showAll, [data-reset-filters]')) {
      event.preventDefault();
      resetFilters(true);
    } else if (button.matches('[data-close]')) {
      closeDialog(button.closest('dialog'));
    } else if (button.matches('[data-gallery-src]')) {
      const mainImage = $('#detailMainImage');
      if (mainImage) {
        mainImage.src = button.dataset.gallerySrc;
        mainImage.alt = `صورة توضيحية ${format(Number(button.dataset.galleryIndex) + 1)} لـ${button.dataset.galleryTitle}`;
      }
      $$('.gallery-thumb').forEach((thumb) => {
        thumb.classList.toggle('is-active', thumb === button);
        thumb.setAttribute('aria-pressed', String(thumb === button));
      });
    } else if (button.matches('[data-inquire]')) {
      setInterestProperty(button.dataset.inquire);
    } else if (button.matches('[data-contact]')) {
      event.preventDefault();
      openDialog($('#contactDialog'), button);
      closeMobileMenu();
    } else if (button.matches('[data-list-property], [data-add-property]')) {
      event.preventDefault();
      const status = $('#listingStatus');
      if (status) status.textContent = '';
      openDialog($('#listingDialog'), button);
      closeMobileMenu();
    } else if (button.matches('[data-dashboard]')) {
      event.preventDefault();
      renderDashboard();
      openDialog($('#dashboardDialog'), button);
      closeMobileMenu();
    } else if (button.matches('#menuToggle')) {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', expanded ? 'إغلاق القائمة' : 'فتح القائمة');
      $('#mainNav')?.classList.toggle('is-open', expanded);
      document.body.classList.toggle('menu-open', expanded);
    }
    if (button.matches('#mainNav a')) {
      closeMobileMenu();
      $$('#mainNav a').forEach((link) => {
        link.classList.toggle('nav-active', link === button);
        if (link === button) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-property-status]')) {
      const id = event.target.dataset.propertyStatus;
      const status = event.target.value;
      if (!propertyStatus.has(id) || !['available', 'draft'].includes(status)) return;
      propertyStatus.set(id, status);
      applyFilters(false);
      const current = event.target;
      const available = properties.filter((item) => propertyStatus.get(item.id) === 'available').length;
      const stats = $$('.dashboard-summary strong');
      if (stats[1]) stats[1].textContent = format(available);
      if (stats[2]) stats[2].textContent = format(properties.length - available);
      const property = properties.find((item) => item.id === id);
      const message = $('#dashboardStatus');
      if (message) message.textContent = `أصبحت حالة «${property.title}» ${status === 'draft' ? 'مسودة' : 'معروضاً'} في هذه الجلسة فقط. لم تُحفظ أي بيانات.`;
      current.focus();
    }
    if (event.target.matches('#sortProperties')) renderProperties();
    if (event.target === field('purpose')) updatePurposeTabs();
  });

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilters(true);
  });
  ['minPrice', 'maxPrice'].forEach((name) => field(name)?.addEventListener('input', () => field('maxPrice')?.setCustomValidity('')));

  $('#interestForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const status = $('#interestStatus');
    if (status) {
      status.textContent = latestInterestProperty
        ? `اكتملت تجربة الاستفسار عن «${latestInterestProperty.title}». هذا نموذج للعرض فقط؛ لم يُرسل طلب ولم تُحفظ بياناتك.`
        : 'اكتملت تجربة نموذج الاهتمام. هذا نموذج للعرض فقط؛ لم تُرسل بياناتك أو تُحفظ، ولا يوجد اتصال بخدمة فعلية.';
      status.classList.add('is-success');
    }
    form.reset();
    latestInterestProperty = null;
  });

  $('#listingForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const status = $('#listingStatus');
    if (status) {
      status.textContent = 'اكتملت تجربة إضافة العقار. لم يُنشر العقار ولم تُحفظ أو تُرسل أي بيانات. هذه نافذة توضيحية لخطوات الإضافة فقط.';
      status.classList.add('is-success');
    }
    form.reset();
  });

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('has-dialog');
      const trigger = dialogTriggers.get(dialog);
      if (trigger?.isConnected && !trigger.closest('dialog:not([open])')) trigger.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileMenu();
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
    if (event.matches) closeMobileMenu();
  });

  applyFilters(false);
})();

