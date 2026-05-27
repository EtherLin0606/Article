// source/js/mouse-click.js
(function () {
    const content = [
        "我们终此一生，就是要摆脱他人的期待，找到真正的自己",
        "不必追赶谁的脚步，你有自己的时区",
        "接受自己的普通，然后拼尽全力去与众不同",
        "所谓成熟，就是学会与不完美的自己和解",
        "你不需要成为任何人眼中的光，你只需要照亮自己的路",
        "愿你在冷铁卷刃前，得以窥见天光",
        "世界很喧嚣，但你可以选择安静地生长",
        "温柔不是妥协，是历经世事后的通透",
        "万物皆有裂痕，那是光照进来的地方",
        "别慌，月亮也正在大海某处迷茫",
        "焦虑是自由的眩晕"
    ];
    const colors = [
        '#009B9E', '#2E86AB', '#4CC9F0', '#20B2AA', '#5A7D8C',
        '#F4A261', '#3A8FB7', '#008B8B', '#6AADCF', '#2E86AB', '#009B9E'
    ];

    document.addEventListener('click', function (e) {
        // 排除链接、按钮等可交互元素
        if (e.target.closest('a, button, input, textarea, .btn')) return;

        const text = content[Math.floor(Math.random() * content.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const span = document.createElement('span');
        span.textContent = text;
        Object.assign(span.style, {
            position: 'fixed',
            left: e.clientX + 'px',
            top: e.clientY + 'px',
            color: color,
            fontSize: '14px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: '9999',
            whiteSpace: 'nowrap',
            transform: 'translate(-50%, -50%)',
            transition: 'all 1s ease-out',
            opacity: '1',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
        });

        document.body.appendChild(span);

        // 触发动画
        requestAnimationFrame(() => {
            span.style.transform = 'translate(-50%, calc(-50% - 60px))';
            span.style.opacity = '0';
        });

        // 动画结束后移除元素
        setTimeout(() => span.remove(), 1000);
    });
})();