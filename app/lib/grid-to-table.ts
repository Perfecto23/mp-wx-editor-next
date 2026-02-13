/**
 * Grid → Table 转换
 * 将 CSS Grid 图片网格转换为 HTML Table（公众号兼容）
 * 迁移自 app.js:1294-1409
 */

/**
 * 将文档中所有 .image-grid 转换为 table
 */
export function convertGridToTable(doc: Document): void {
  const imageGrids = doc.querySelectorAll('.image-grid');

  imageGrids.forEach(grid => {
    const columns = parseInt(grid.getAttribute('data-columns') || '2', 10);
    convertToTable(doc, grid, columns);
  });
}

/**
 * 将单个 grid 元素转换为 table
 */
function convertToTable(doc: Document, grid: Element, columns: number): void {
  const imgWrappers = Array.from(grid.children);

  const table = doc.createElement('table');
  table.setAttribute('style', [
    'width: 100% !important',
    'border-collapse: collapse !important',
    'margin: 20px auto !important',
    'table-layout: fixed !important',
    'border: none !important',
    'background: transparent !important'
  ].join('; '));

  const rows = Math.ceil(imgWrappers.length / columns);

  for (let i = 0; i < rows; i++) {
    const tr = doc.createElement('tr');

    for (let j = 0; j < columns; j++) {
      const index = i * columns + j;
      const td = doc.createElement('td');

      td.setAttribute('style', [
        'padding: 4px !important',
        'vertical-align: top !important',
        `width: ${100 / columns}% !important`,
        'border: none !important',
        'background: transparent !important'
      ].join('; '));

      if (index < imgWrappers.length) {
        const imgWrapper = imgWrappers[index];
        const img = imgWrapper.querySelector('img');

        if (img) {
          const imgMaxHeight = '340px';
          const containerHeight = '360px';

          // 外层容器（table 布局方式居中）
          const wrapper = doc.createElement('div');
          wrapper.setAttribute('style', [
            'width: 100% !important',
            `height: ${containerHeight} !important`,
            'text-align: center !important',
            'background-color: #f5f5f5 !important',
            'border-radius: 4px !important',
            'padding: 10px !important',
            'box-sizing: border-box !important',
            'overflow: hidden !important',
            'display: table !important'
          ].join('; '));

          // 内层居中容器
          const innerWrapper = doc.createElement('div');
          innerWrapper.setAttribute('style', [
            'display: table-cell !important',
            'vertical-align: middle !important',
            'text-align: center !important'
          ].join('; '));

          // 克隆图片
          const newImg = img.cloneNode(true) as HTMLImageElement;
          newImg.setAttribute('style', [
            'max-width: calc(100% - 20px) !important',
            `max-height: ${imgMaxHeight} !important`,
            'width: auto !important',
            'height: auto !important',
            'display: inline-block !important',
            'margin: 0 auto !important',
            'border-radius: 4px !important',
            'object-fit: contain !important'
          ].join('; '));

          innerWrapper.appendChild(newImg);
          wrapper.appendChild(innerWrapper);
          td.appendChild(wrapper);
        }
      }

      tr.appendChild(td);
    }

    table.appendChild(tr);
  }

  grid.parentNode!.replaceChild(table, grid);
}
