/**
 * 连续图片分组算法
 * 将 Markdown 中连续的图片自动分组为 CSS Grid 网格布局
 * 迁移自 app.js:1106-1292
 */

interface ImageItem {
  element: Element;
  img: HTMLImageElement;
  index: number;
  inSameParagraph: boolean;
  paragraphImageCount: number;
}

export function groupConsecutiveImages(doc: Document): void {
  const body = doc.body;
  const children = Array.from(body.children);

  const imagesToProcess: ImageItem[] = [];

  // 收集所有图片
  children.forEach((child, index) => {
    if (child.tagName === 'P') {
      const images = child.querySelectorAll('img');
      if (images.length > 1) {
        // 多个图片在同一个 P 标签内
        const group = Array.from(images).map(img => ({
          element: child,
          img: img as HTMLImageElement,
          index,
          inSameParagraph: true,
          paragraphImageCount: images.length
        }));
        imagesToProcess.push(...group);
      } else if (images.length === 1) {
        imagesToProcess.push({
          element: child,
          img: images[0] as HTMLImageElement,
          index,
          inSameParagraph: false,
          paragraphImageCount: 1
        });
      }
    } else if (child.tagName === 'IMG') {
      imagesToProcess.push({
        element: child,
        img: child as HTMLImageElement,
        index,
        inSameParagraph: false,
        paragraphImageCount: 1
      });
    }
  });

  // 分组逻辑
  const groups: ImageItem[][] = [];
  let currentGroup: ImageItem[] = [];

  imagesToProcess.forEach((item, i) => {
    if (i === 0) {
      currentGroup.push(item);
    } else {
      const prevItem = imagesToProcess[i - 1];
      let isContinuous = false;

      if (item.index === prevItem.index) {
        isContinuous = true;
      } else if (item.index - prevItem.index === 1) {
        isContinuous = true;
      }

      if (isContinuous) {
        currentGroup.push(item);
      } else {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [item];
      }
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // 处理每组图片
  groups.forEach(group => {
    if (group.length < 2) return;

    const imageCount = group.length;
    const firstElement = group[0].element;

    const gridContainer = doc.createElement('div');
    gridContainer.setAttribute('class', 'image-grid');
    gridContainer.setAttribute('data-image-count', String(imageCount));

    let gridStyle = '';
    let columns = 2;

    if (imageCount === 2) {
      gridStyle = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;';
      columns = 2;
    } else if (imageCount === 3) {
      gridStyle = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;';
      columns = 3;
    } else if (imageCount === 4) {
      gridStyle = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;';
      columns = 2;
    } else {
      gridStyle = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px auto; max-width: 100%; align-items: start;';
      columns = 3;
    }

    gridContainer.setAttribute('style', gridStyle);
    gridContainer.setAttribute('data-columns', String(columns));

    // 添加图片到容器
    group.forEach((item) => {
      const imgWrapper = doc.createElement('div');
      imgWrapper.setAttribute('style', 'width: 100%; height: auto; overflow: hidden;');

      const img = item.img.cloneNode(true) as HTMLImageElement;
      img.setAttribute('style', 'width: 100%; height: auto; display: block; border-radius: 8px;');

      imgWrapper.appendChild(img);
      gridContainer.appendChild(imgWrapper);
    });

    // 替换
    firstElement.parentNode!.insertBefore(gridContainer, firstElement);

    const elementsToRemove = new Set<Element>();
    group.forEach(item => elementsToRemove.add(item.element));
    elementsToRemove.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  });
}
