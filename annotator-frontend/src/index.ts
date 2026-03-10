let basePath = '/annotator-frontend';
try {
    const scriptUrl = document.currentScript ? (document.currentScript as HTMLScriptElement).src : '';
    if (scriptUrl) {
        basePath = scriptUrl.substring(0, scriptUrl.lastIndexOf('/'));
    }
} catch (e) {
    console.warn('Could not determine UMD path, falling back');
}

(window as any).__ANNOTATOR_BASE_PATH__ = basePath + '/';

const OriginalWorker = window.Worker;
window.Worker = class extends OriginalWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
        const urlStr = scriptURL.toString();
        if (urlStr.startsWith('http') && new URL(urlStr).origin !== window.location.origin) {
            const blob = new Blob([`importScripts('${urlStr}');`], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            super(blobUrl, options);
        } else {
            super(scriptURL, options);
        }
    }
} as any;

import App from "@/layouts/segmentation-layout/Default.vue"
export default App;
