let imgSequence = [];
let numImages = 480;
let currentImg = 0;
let noiseImg;
let tileSize = 40;
let cols, rows;
let speeds = [];
let bgImage;
let speedFactor = 1.5; 

let introSequence = [];
let numIntroImages = 360
let introDone = false;

let additionalImages = [];
let numAdditionalImages = 400;

let allImages = numImages + numIntroImages; 

let rects = []; 
let world; 
let engine;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startDragX;
let startDragY;
let startOffsetX;
let startOffsetY;

let scaleFactor = 0.5; // Default value

let colorThief = new ColorThief();




function preload() {
  let numLoaded = 0;
  for (let i = 1; i <= numImages; i++) {
    imgSequence[i] = loadImage(`./sources/imgSeq/srcimg (${i}).jpg`, () => {
      numLoaded++;
      updateLoadingProgress(numLoaded / allImages);
  });
  }

  for (let i = 1; i <= numIntroImages; i++) {
    introSequence[i] = loadImage(`./sources/introImg/introImg (${i}).jpg`, () => {
      numLoaded++;
      updateLoadingProgress(numLoaded / allImages);
  });
  }

  for (let i = 1; i <= numAdditionalImages; i++) {
    additionalImages[i] = loadImage(`./sources/additional/hongdae (${i}).jpg`, () => {
  });
  }

}

function updateLoadingProgress(progress) {
  let progressElement = document.getElementById('loadingProgress').firstElementChild;
  progressElement.style.transform = `scaleX(${progress})`;
  const textElement = document.getElementById('loadingText');
  textElement.innerText = `탐색 공간 입장 중... ${Math.round(progress * 100)}%`;
}

function setup() {
  document.getElementById('loadingScreen').style.display = 'none';
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  noiseDetail(8, 0.65);
  noiseImg = createGraphics(2560, 1440);
  cols = floor(noiseImg.width / tileSize);
  rows = floor(noiseImg.height / tileSize);

  engine = Matter.Engine.create();
  engine.world.gravity.y = 0;
  world = engine.world;

  for (let i = 1; i <= numAdditionalImages; i++) {
    let img = additionalImages[i];
    let w = img.width * scaleFactor;
    let h = img.height * scaleFactor;

    let rect = Matter.Bodies.rectangle(random(windowWidth/3, windowWidth/3*2), random(windowHeight/3, windowHeight/3*2), w, h, {isStatic: false});
    Matter.World.add(world, rect);

    let forceMagnitude = 0.1; // 힘의 크기를 조절하는 파라미터. 원하는대로 조절 가능
    let randomForceX = random(-forceMagnitude, forceMagnitude);
    let randomForceY = random(-forceMagnitude, forceMagnitude);
    Matter.Body.applyForce(rect, rect.position, {x: randomForceX, y: randomForceY});

    // 주기적인 움직임을 위한 값
    let oscillationSpeed = random(0.001, 0.0025);
    let oscillationDirection = random([-0.01, 0.01]);
    
    rects.push({
      body: rect,
      img: img,
      oscSpeed: oscillationSpeed,
      oscDirection: oscillationDirection,
      targetScale: scaleFactor,
      currentScale: scaleFactor,
      scaleStartTime: 0,
    });    
  }

}

function draw() {
  generateNoise();
  // displayImageWithNoise();
  if (!introDone) {
    playIntroSequence();
  } else {
    displayImageWithNoise();

    Matter.Engine.update(engine);  // 물리 엔진 업데이트
    let now = millis();

    push();
    translate(offsetX, offsetY);  // offsetX만큼 오프셋 이동
    for (let r of rects) {
      let pos = r.body.position;
      let angle = r.body.angle;

      let w = r.img.width * r.currentScale;
      let h = r.img.height * r.currentScale;

      // Adjust for offsetX and offsetY when checking for mouse position
      let adjustedMouseX = mouseX - offsetX;
      let adjustedMouseY = mouseY - offsetY;

      let mouseOverRect = adjustedMouseX > pos.x - w / 2 && adjustedMouseX < pos.x + w / 2 &&
                          adjustedMouseY > pos.y - h / 2 && adjustedMouseY < pos.y + h / 2;

      let targetScale = mouseOverRect ? 1.2 * scaleFactor : scaleFactor;

      if (r.targetScale !== targetScale) {
        r.targetScale = targetScale;
        r.scaleStartTime = now;
      }
  
      let elapsedTime = now - r.scaleStartTime;
      if (elapsedTime < 250) {
        let t = map(elapsedTime, 0, 250, 0, 1); // 0.5 seconds for the transition
        t = (1 - cos(PI * t)) / 2; // ease in ease out
        r.currentScale = lerp(r.currentScale, r.targetScale, t);
      } else {
        r.currentScale = r.targetScale;
      }
  
      if (mouseOverRect) {
        w *= 1.1;
        h *= 1.1;
      }

      push();
      translate(pos.x, pos.y);
      rotate(angle);
      imageMode(CENTER);
      image(r.img, 0, 0, w, h);
      let oscillation = sin(frameCount * r.oscSpeed) * r.oscDirection * 10; // 10은 움직임의 크기입니다. 원하는대로 조절할 수 있습니다.
      Matter.Body.setPosition(r.body, { x: r.body.position.x, y: r.body.position.y + oscillation }); 
      pop();
    }
    pop();
    
  }
}

function mouseWheel(event) {
  let prevScaleFactor = scaleFactor; // 이전 scaleFactor 값을 저장

  scaleFactor += event.delta * -0.001;  
  scaleFactor = constrain(scaleFactor, 0.25, 1.5);  

  // scaleFactor 값이 변경됐을 때
  if (prevScaleFactor !== scaleFactor) {
    for (let r of rects) {
      let w = r.img.width * scaleFactor;
      let h = r.img.height * scaleFactor;
      let x = r.body.position.x;
      let y = r.body.position.y;

      // Matter.js의 body 크기를 업데이트
      Matter.Body.scale(r.body, scaleFactor / prevScaleFactor, scaleFactor / prevScaleFactor);

      // scaleFactor가 줄어들었을 때만 이미지를 중앙으로 조금씩 이동
      if (scaleFactor < prevScaleFactor) {
        // 중앙 위치 계산
        let centerX = width / 2;
        let centerY = height / 2;

        // 현재 위치와 중앙 위치 사이의 차이 계산
        let diffX = centerX - x;
        let diffY = centerY - y;

        // 중앙으로 조금씩 이동
        Matter.Body.translate(r.body, {x: diffX * 0.1, y: diffY * 0.1});
      }
    }
  }
}


function mousePressed() {
  if (introDone) {
    startDragX = mouseX;
    startDragY = mouseY;
    startOffsetX = offsetX;
    startOffsetY = offsetY;
    isDragging = true;
  }
}

function mouseReleased() {
  isDragging = false;
}

function mouseDragged() {
  if (isDragging) {
    offsetX = startOffsetX + (mouseX - startDragX);
    offsetY = startOffsetY + (mouseY - startDragY);
  }
}

function calculateDisplayDimensions() {
  let imgRatio = imgSequence[1].width / imgSequence[1].height;
  let winRatio = windowWidth / windowHeight;
  
  if (winRatio > imgRatio) {
    return {width: windowWidth, height: windowWidth / imgRatio};
  } else {
    return {width: windowHeight * imgRatio, height: windowHeight};
  }
}

function playIntroSequence() {
  let {width: displayWidth, height: displayHeight} = calculateDisplayDimensions();


  currentImg += speedFactor; 

  if (floor(currentImg) <= numIntroImages) {
    
    image(introSequence[floor(currentImg)], 0, 0, displayWidth, displayHeight);
  } else {
    
    currentImg = 0;
    introDone = true;
    
  }
}

function getAdjustedMousePosition(scaleX, scaleY) {
  return {
    x: mouseX * scaleX,
    y: mouseY * scaleY
  };
}

function generateNoise() {
  speeds = []; // speeds 배열 초기화

  let {width: displayWidth, height: displayHeight} = calculateDisplayDimensions();

  let scaleX = noiseImg.width / displayWidth;
  let scaleY = noiseImg.height / displayHeight;
  let {x: adjustedMouseX, y: adjustedMouseY} = getAdjustedMousePosition(scaleX, scaleY);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * tileSize;
      let y = j * tileSize;
      let index = i + j * cols;

      let distance = dist(adjustedMouseX, adjustedMouseY, x, y); // 조정된 마우스 위치 사용
      
      let influence = map(constrain(distance, 0, 1440), 0, 1440, 1, 0);      
      let val = noise(x * 0.5, y * 0.5) * 255 * influence;
      noiseImg.fill(val);
      noiseImg.noStroke();
      noiseImg.rect(x, y, tileSize, tileSize);
      speeds[index] = map(val, 0, 255, 0, 360);
    }
  }
}


function displayImageWithNoise() {
  let {width: displayWidth, height: displayHeight} = calculateDisplayDimensions();

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let index = i + j * cols;

      let speed = speeds[index];
      let imgIndex = floor(frameCount  * speedFactor + speed) % numImages + 1;


      let sWidth = imgSequence[imgIndex].width / cols;
      let sHeight = imgSequence[imgIndex].height / rows;
      let sx = i * sWidth;
      let sy = j * sHeight;

      let dWidth = displayWidth / cols;
      let dHeight = displayHeight / rows;
      let dx = i * dWidth;
      let dy = j * dHeight;

      image(imgSequence[imgIndex], dx, dy, dWidth, dHeight, sx, sy, sWidth, sHeight);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  for (let r of rects) {
    let pos = r.body.position;
    let w = r.img.width;
    let h = r.img.height;

    // 윈도우의 너비를 벗어나지 않도록
    if (pos.x < 0) Matter.Body.setPosition(r.body, {x: w / 2, y: pos.y});
    if (pos.x > windowWidth) Matter.Body.setPosition(r.body, {x: windowWidth - w / 2, y: pos.y});

    // 윈도우의 높이를 벗어나지 않도록
    if (pos.y < 0) Matter.Body.setPosition(r.body, {x: pos.x, y: h / 2});
    if (pos.y > windowHeight) Matter.Body.setPosition(r.body, {x: pos.x, y: windowHeight - h / 2});
  }
}