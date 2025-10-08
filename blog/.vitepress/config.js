import { defineConfig } from 'vitepress'

export default defineConfig({
    lang: 'ko-KR',
    title: '칼새둥지',
    description: 'Swift 블로그.',
    cleanUrls: true,
    appearance: 'force-auto',
    sitemap: {
        hostname: 'https://nest.yujingaya.com'
    },
    head: [
        [
            'script',
            { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-7EDSB12GEY' }
        ],
        [
            'script',
            {},
            `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-7EDSB12GEY');`
        ]
    ]
})