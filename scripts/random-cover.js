// scripts/random-cover.js
const covers = [
    '/images/covers/01.jpg',
    '/images/covers/02.jpg',
    '/images/covers/03.jpg',
    '/images/covers/04.jpg',
    '/images/covers/05.jpg',
    '/images/covers/06.jpg'
];

hexo.extend.filter.register('before_post_render', function (data) {
    // 仅对没有手动设置 cover 的文章生效
    if (!data.cover && data.layout === 'post') {
        // 使用文章源文件路径进行哈希，保证同一篇文章每次构建封面固定不变
        let hash = 0;
        const str = data.source || '';
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        data.cover = covers[Math.abs(hash) % covers.length];
    }
    return data;
});