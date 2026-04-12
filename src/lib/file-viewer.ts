export function isHtmlDocument(fileName: string, fileType?: string | null) {
  return fileType === 'text/html' || fileName.toLowerCase().endsWith('.html')
}

export function openTemplateViewer(filePath: string, fileName: string) {
  const base = window.location.href.split('#')[0].split('?')[0]
  const url = `${base}#/template-view?url=${encodeURIComponent(filePath)}&name=${encodeURIComponent(fileName)}`
  window.open(url, '_blank', 'noopener')
}

export function openSavedFile(filePath: string, fileName: string, fileType?: string | null) {
  if (isHtmlDocument(fileName, fileType)) {
    openTemplateViewer(filePath, fileName)
    return
  }
  window.open(filePath, '_blank', 'noopener')
}
