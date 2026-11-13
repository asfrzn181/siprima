// Pilihan sumber berkas: unggah berkas atau tempel tautan Google Drive.
// Elemen [data-berkas] berisi radio [name] dan panel [data-berkas-panel].
export const pasangPilihanBerkas = (scope = document) => {
  scope.querySelectorAll('[data-berkas]').forEach((grup) => {
    const radios = [...grup.querySelectorAll('input[type="radio"]')];
    if (!radios.length) return;
    const panelUpload = grup.querySelector('[data-berkas-panel="upload"]');
    const panelDrive = grup.querySelector('[data-berkas-panel="drive"]');
    const sinkron = () => {
      const mode = grup.querySelector('input[type="radio"]:checked')?.value || 'upload';
      if (panelUpload) panelUpload.hidden = mode !== 'upload';
      if (panelDrive) panelDrive.hidden = mode !== 'drive';
    };
    radios.forEach((radio) => radio.addEventListener('change', sinkron));
    sinkron();
  });
};
