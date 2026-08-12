/**
 * Helper to process, resize and compress user-uploaded avatar photos
 * from gallery or camera before saving to local state/storage.
 */
export function processProfilePhoto(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao carregar a imagem selecionada.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Crop square or fit within bounds
        const size = Math.min(width, height);
        const startX = (width - size) / 2;
        const startY = (height - size) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Não foi possível inicializar o renderizador da imagem.'));
          return;
        }

        // Draw centered square crop
        ctx.drawImage(
          img,
          startX,
          startY,
          size,
          size,
          0,
          0,
          maxWidth,
          maxHeight
        );

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
