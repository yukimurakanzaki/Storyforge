// Sidebar shell — emits HTML matching the current page's data-page attribute.
(function(){
  const NAV = [
    { group: 'Mulai', items: [
      { id: 'overview', label: 'Ringkasan', href: 'index.html' },
      { id: 'sample',   label: 'Contoh Aplikasi', href: 'sample.html' },
    ]},
    { group: 'Foundations', items: [
      { id: 'typography', label: 'Tipografi', href: 'typography.html' },
      { id: 'colors',     label: 'Warna',     href: 'colors.html' },
      { id: 'spacing',    label: 'Spacing, Radius, Shadow', href: 'spacing.html' },
    ]},
    { group: 'Components', items: [
      { id: 'buttons',   label: 'Buttons',     href: 'buttons.html' },
      { id: 'inputs',    label: 'Input',       href: 'inputs.html' },
      { id: 'selection', label: 'Selection',   href: 'selection.html' },
      { id: 'chips',     label: 'Chips',       href: 'chips.html' },
      { id: 'avatar',    label: 'Avatar',      href: 'avatar.html' },
      { id: 'toast',     label: 'Toast',       href: 'toast.html' },
      { id: 'navigation',label: 'Navigation',  href: 'navigation.html' },
      { id: 'tables',    label: 'Tables',      href: 'tables.html' },
    ]},
    { group: 'Aset & Pola', items: [
      { id: 'logos',  label: 'Logo & Ilustrasi', href: 'logos.html' },
      { id: 'errors', label: 'Halaman Error',     href: 'errors.html' },
    ]}
  ];

  function buildSidebar(active){
    let html = '<div class="brand"><div class="brand-mark">B</div><div>BOSS<br><span style="font-weight:500;font-size:11px;letter-spacing:.04em;color:rgba(255,255,255,.6)">Design System</span></div></div>';
    NAV.forEach(group => {
      html += `<div class="nav-group"><div class="nav-label">${group.group}</div>`;
      group.items.forEach(it => {
        const cls = it.id === active ? 'nav-link active' : 'nav-link';
        html += `<a class="${cls}" href="${it.href}"><span class="dot"></span>${it.label}</a>`;
      });
      html += '</div>';
    });
    return html;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      const active = document.body.getAttribute('data-page') || '';
      sidebar.innerHTML = buildSidebar(active);
    }
  });
})();
