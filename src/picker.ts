import { config } from './config';

// LinkedIn's Photo, Video and Media buttons call input.click() on a file input the moment
// the upload step opens, which forces the OS file picker. That click is untrusted, so we
// cancel it when it follows a media button. LinkedIn then shows "Loading" until the picker
// reports back, so we report a dismissed picker (`cancel`) once its click handling is done;
// the screen settles on "Upload from computer", which still opens the picker.
export function installPickerGuard(): void {
  let lastMediaClick = 0;
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (e.isTrusted) {
      const control = target instanceof Element ? target.closest('button, [role="button"], a') : null;
      const isMedia = control?.matches('[data-action="media"]') || control?.querySelector('svg#image-outline-medium, svg#video-outline-medium');
      lastMediaClick = isMedia ? Date.now() : 0;
    } else if (target instanceof HTMLInputElement && target.type === 'file' && Date.now() - lastMediaClick < 5000 && !config().instantFilePicker) {
      e.preventDefault();
      lastMediaClick = 0;
      setTimeout(() => target.dispatchEvent(new Event('cancel', { bubbles: true })));
    }
  }, true);
}
