export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', () => {
    // scope must be set explicitly since sw.js lives under js/, which would
    // otherwise limit it to controlling only pages under js/ instead of the whole site
    navigator.serviceWorker.register('/country_flags/js/sw.js', { scope: '/country_flags/' })
      .then((reg) => console.log('Service Worker registered!', reg))
      .catch((err) => console.log('Registration failed: ', err));
  });
}
