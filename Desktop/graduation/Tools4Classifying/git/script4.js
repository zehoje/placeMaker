import * as THREE from 'three';
// import Stats from './stats.module.js';
import { OrbitControls } from './OrbitControls.js';
import { EffectComposer } from './EffectComposer.js';
import { RenderPass } from './RenderPass.js';
import { ShaderPass } from './ShaderPass.js';
import { OutlinePass } from './OutlinePass.js';


// Configuration and state variables
let camera, scene, renderer, controls;
let composer, outlinePass;
const imageFiles = [];
for (let i = 1; i <= 29*21; i++) {
    imageFiles.push(`./sources/additional/hongdae (${i}).jpg`);
}

const colorThief = new ColorThief();

let circleRadius = 34;
let radiusFactor = 0.135;

const imgSprites = [];
const lineSprites = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const scaleUpDuration = 150;
const scaleDownDuration = 3000;

let originalPositions = new Map();


init();


function ranNum(min, max) {
    return Math.random() * (max - min) + min;
}


function handleLongClick() {
    randomizeSpritePositions();
    randomizePointsPositions();

    // 'long' ID가 가진 이벤트 핸들러를 잠시 제거
    const longButton = document.getElementById('long');
    longButton.removeEventListener('click', handleLongClick);

    // 5초 후에 다시 이벤트 핸들러 추가
    setTimeout(() => {
        longButton.addEventListener('click', handleLongClick);
    }, 6000);
}

// 최초 이벤트 핸들러 설정
document.getElementById('long').addEventListener('click', handleLongClick);

let pointsAnimationData = []; // 각 포인트의 애니메이션 데이터를 저장하는 배열
let isAnimating = false; // 애니메이션 진행 중인지 여부

function initializePointsAnimationData(points) {
    const positions = points.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        pointsAnimationData.push({
            originalPosition: new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)),
            targetPosition: new THREE.Vector3(),
            isMoving: false,
            atOriginalPosition: true // 초기값을 true로 설정
        });
    }
}

function randomizePointsPositions() {
    const points = scene.getObjectByName('circlePoints');
    if (points && pointsAnimationData.length === 0) {
        initializePointsAnimationData(points);
    }

    isAnimating = true;

    pointsAnimationData.forEach(data => {
        if (!data.isMoving) {
            if (data.atOriginalPosition) {
                data.targetPosition.set(
                    data.originalPosition.x + ranNum(-2500, 2500),
                    data.originalPosition.y,
                    data.originalPosition.z + ranNum(-1000, 1000)
                );
                data.atOriginalPosition = false;
            } else {
                data.targetPosition.copy(data.originalPosition);
                data.atOriginalPosition = true;
            }
            data.isMoving = true;
        }
    });
}

function updatePointsAnimation() {
    const points = scene.getObjectByName('circlePoints');
    if (points && isAnimating) {
        const positions = points.geometry.attributes.position;

        let allPointsArrived = true;

        pointsAnimationData.forEach((data, i) => {
            if (data.isMoving) {
                const currentPos = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
                currentPos.lerp(data.targetPosition, 0.032); // 부드럽게 이동

                if (currentPos.distanceTo(data.targetPosition) < 0.1) {
                    currentPos.copy(data.targetPosition); // 목표 위치 도달
                    data.isMoving = false;
                } else {
                    allPointsArrived = false;
                }

                positions.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);
            }
        });

        positions.needsUpdate = true;

        if (allPointsArrived) {
            isAnimating = false; // 모든 포인트가 목표 위치에 도달했을 경우 애니메이션 종료
        }
    }
}

let isSpritesRandomized = false; // 스프라이트가 랜덤 위치에 있는지 여부를 추적하는 플래그

function randomizeSpritePositions() {
    const durationTime = 5000;

    lineSprites.forEach(sprite => {
        if (!originalPositions.has(sprite)) {
            // 스프라이트의 초기 위치를 저장
            originalPositions.set(sprite, { x: sprite.position.x, z: sprite.position.z });
        }

        const originalPos = originalPositions.get(sprite);
        let newPosX, newPosZ;

        if (!isSpritesRandomized) {
            // 새로운 랜덤 위치 계산
            newPosX = originalPos.x * 5 + ranNum(-10, 10);
            newPosZ = originalPos.z + ranNum(-1000, 1000);
        } else {
            // 원래 위치로 복귀
            newPosX = originalPos.x;
            newPosZ = originalPos.z;
        }

        // 스프라이트 이동
        new TWEEN.Tween(sprite.position)
            .to({ x: newPosX, z: newPosZ }, durationTime)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        if (sprite.userData.relatedSprite) {
            new TWEEN.Tween(sprite.userData.relatedSprite.position)
                .to({ x: newPosX, z: newPosZ }, durationTime)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    });

    isSpritesRandomized = !isSpritesRandomized; // 플래그 토글
}


function init() {
    // Scene setup
    camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 100000);
    camera.position.z = 3000;
    scene = new THREE.Scene();

    scene.rotation.x = 0; 
    scene.rotation.y = 0; 
    scene.rotation.z = 0;  
    scene.position.x = 0; 
    scene.position.y = 0;
    scene.position.z = 0;
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    document.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('click', onSpriteClick, false);

    scene.background = new THREE.Color( 'black' );

    setupParticles();
    setupCameraControls();

    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    composer.addPass(outlinePass);
    animate();
}

function setupParticles() {
    const circleTexture = createCircleTexture(64, 'white'); // 반지름이 64px인 흰색 원
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    

    const gridWidth = 256; // 가로 방향 입자 수
    const gridHeight = 144; // 세로 방향 입자 수
    const spacing = 34 * radiusFactor; // 입자 간 간격
    const zPosition = 0; // 모든 입자의 Z 위치를 고정
    
    const offsetX = - ((gridWidth - 1) * spacing) / 2;
    const offsetY = - ((gridHeight - 1) * spacing) / 2;

    // 이미지 로더 초기화
    const loader = new THREE.TextureLoader();
    const textures = imageFiles.map(file => {
        return new Promise((resolve, reject) => {
            loader.load(file, resolve, undefined, reject);
        });
    });

    // 이미지 로드
    loader.load('sources/hongdaeImg.png', function(texture) {
    
    // 이미지의 데이터를 가져옴
    const image = texture.image;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 캔버스의 크기를 이미지 크기로 설정
    canvas.width = image.width;
    canvas.height = image.height;
    
    // 이미지를 캔버스에 그림
    context.drawImage(image, 0, 0, image.width, image.height);
    
    // 이미지의 픽셀 데이터를 가져옴
    const imageData = context.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;

    // 색상 배열 생성
    const colors = [];

    // 각 축에 대한 간격 계산
    const stepX = image.width / gridWidth;
    const stepY = image.height / gridHeight;

    // 그리드 형식으로 색상을 추출
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            let colorCounts = {};

            const startY = Math.floor(i * stepY);
            const endY = Math.floor((i + 1) * stepY);
            const startX = Math.floor(j * stepX);
            const endX = Math.floor((j + 1) * stepX);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const stride = (y * image.width + x) * 4;
                    const r = quantizeColor(data[stride]);
                    const g = quantizeColor(data[stride + 1]);
                    const b = quantizeColor(data[stride + 2]);
                    const colorKey = `rgb(${r},${g},${b})`;

                    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
                }
            }

            // 상위 3개 색상을 찾아서 평균을 구함
            let topColors = Object.keys(colorCounts)
                .sort((a, b) => colorCounts[b] - colorCounts[a])
                .slice(0, 1);

            let avgR = 0, avgG = 0, avgB = 0;
            topColors.forEach(color => {
                const [r, g, b] = color.match(/\d+/g).map(Number);
                avgR += r;
                avgG += g;
                avgB += b;
            });

            avgR /= topColors.length;
            avgG /= topColors.length;
            avgB /= topColors.length;

            // 평균 색상 값으로 새 색상 객체 생성
            const color = new THREE.Color(avgR / 255, avgG / 255, avgB / 255);
            colors.push(color.r, color.g, color.b);
        }
    }

    Promise.all(textures).then((loadedTextures) => {
        loadedTextures.forEach((texture, index) => {           
            // ColorThief를 사용해 텍스처의 이미지로부터 주 색상을 추출합니다.
            const img = texture.image;
            const color = colorThief.getColor(img); // [R, G, B] 형식으로 색상을 반환합니다.
            const material = new THREE.SpriteMaterial({ 
                color: `rgb(${color[0]}, ${color[1]}, ${color[2]})` 
            });
            const sprite = new THREE.Sprite(material);
            sprite.name = 'color';
            
            const maxWidth = 20; // 최대 가로 너비
            const maxHeight = maxWidth; // 최대 세로 너비
            let width = img.width;
            let height = img.height;
            const aspectRatio = width / height;

                    // 가로 너비가 최대치를 넘을 경우 조정
            if (width > maxWidth) {
                width = maxWidth;
                height = width / aspectRatio;
            }

            // 세로 너비가 최대치를 넘을 경우 조정
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
            }

            const imgStroke = 5
            sprite.scale.set(width + imgStroke, height + imgStroke, 1);
            
            // 여기서 외곽선을 위한 두 번째 스프라이트를 만듭니다.
            const imgMaterial = new THREE.SpriteMaterial({
                map : texture, // 외곽선의 색상을 설정합니다.
            });
            const imgSprite = new THREE.Sprite(imgMaterial);
            imgSprite.scale.set(width, height , 1); // 원본 스프라이트보다 약간 크게 설정
            imgSprite.name = 'img';

            sprite.userData.relatedSprite = imgSprite;
            imgSprite.userData.relatedSprite = sprite;

            const spriteGridWidth = 29;
            const spriteGridHeight = 21;
            const spriteSpacing = (maxWidth+imgStroke)*1.05;

            const gridX = index % spriteGridWidth; // 그리드의 x 위치
            const gridY = Math.floor(index / spriteGridWidth); // 그리드의 y 위치
    
            if (gridY < spriteGridHeight) {
                const x = offsetX + gridX * spriteSpacing + (spacing * gridWidth)/2 - (spriteSpacing*spriteGridWidth/2);
                const y = offsetY + gridY * spriteSpacing + (spacing * gridHeight)/2 - (spriteSpacing*spriteGridHeight/2);
                const z = ranNum(-5,5) + 100
    
                // 스프라이트의 위치 설정
                sprite.position.set(x*1.25, -y, z);
                imgSprite.position.set(x*1.25, -y, z);

                scene.add(imgSprite);
                scene.add(sprite);

                imgSprites.push(imgSprite);
                lineSprites.push(sprite);
            }           
        });

        // 각 포인트의 색상을 저장할 배열
        const pointColors = [];

        for (let i = 0; i < gridHeight; i++) {
            for (let j = 0; j < gridWidth; j++) {
                const positionIndex = i * gridWidth + j;

                const x = offsetX + j * spacing;
                const y = offsetY + i * spacing;
                const z = zPosition;

                // 위치 데이터 추가
                vertices.push(x, -y, z);

                // 색상 데이터 추가
                const color = new THREE.Color(colors[positionIndex * 3], colors[positionIndex * 3 + 1], colors[positionIndex * 3 + 2]);
                pointColors.push(color.r, color.g, color.b);       
            }
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3)); // 색상 데이터 설정

        const pointsMaterial = new THREE.PointsMaterial({
            map: circleTexture,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            vertexColors: true
        });

        const points = new THREE.Points(geometry, pointsMaterial);
        points.frustumCulled = false;

        points.name = 'circlePoints';

        scene.add(points);     
        console.log(vertices.length);    
    });
    

    });
    
}


function quantizeColor(value) {
    // 색상을 16단계로 양자화합니다.
    return Math.floor(value / 1) * 1;
}

function createCircleTexture(radius, color) {
    const size = radius * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');


    // 원 그리기
    context.beginPath();
    context.arc(radius, radius, radius, 0, Math.PI * 2, false);
    context.fillStyle = color;
    context.fill();

    return new THREE.CanvasTexture(canvas);
}



function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}




function setupCameraControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = true;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI - 0.1;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE // PAN,DOLLY,ROTATE
    };
}


function onSpriteClick(event) {
    // 마우스 위치를 정규화된 디바이스 좌표로 변환합니다.
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // 레이캐스터를 업데이트합니다.
    raycaster.setFromCamera(mouse, camera);

    // 교차하는 객체가 있는지 확인합니다.
    const intersects = raycaster.intersectObjects(scene.children);

    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.name === 'img') {
            const targetSprite = intersects[i].object;

            // 스프라이트의 세계 좌표를 얻습니다.
            const targetWorldPosition = new THREE.Vector3();
            targetSprite.getWorldPosition(targetWorldPosition);

            // 카메라와 타겟의 최종 위치를 계산합니다.
            const finalCameraPosition = {
                x: targetWorldPosition.x,
                y: targetWorldPosition.y,
                z: targetWorldPosition.z + 500 // 카메라를 적절히 뒤로 배치합니다.
            };


            // 카메라 위치 애니메이션을 설정합니다.
            new TWEEN.Tween(camera.position)
                .to(finalCameraPosition, 2000) // 2000ms 동안 이동
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(() => camera.lookAt(targetWorldPosition)) // 카메라가 타겟을 바라보도록 합니다.
                .start();

            // OrbitControls 타겟 애니메이션을 설정합니다.
            new TWEEN.Tween(controls.target)
                .to({ x: targetWorldPosition.x, y: targetWorldPosition.y, z: targetWorldPosition.z }, 2000) // 2000ms 동안 이동
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(() => controls.update()) // 애니메이션 동안 지속적으로 업데이트
                .start();


            break;
        }
    }
}


function clampCameraZ(camera, minZ, maxZ) {
    camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
}

function updateCircleSpriteSizes() {
    const minZ = 1000;
    const maxZ = 2500;
    let size;
    if (camera.position.z <= minZ) {
        size = circleRadius;
    } else if (camera.position.z >= maxZ) {
        size = 0;
    } else {
        size = circleRadius * (1 - (camera.position.z - minZ) / (maxZ - minZ));
    }

    const points = scene.getObjectByName('circlePoints');
    if (points) {
        points.material.size = size;
        points.material.needsUpdate = true;
    }
}

function updateBackgroundColor() {
    const minZ = 1000; // 카메라 Z 위치의 최소값
    const maxZ = 2500;  // 카메라 Z 위치의 최대값
    const colorWhite = new THREE.Color('white');
    const colorBlack = new THREE.Color('black');

    let colorFactor;
    if (camera.position.z <= minZ) {
        colorFactor = 1;
    } else if (camera.position.z >= maxZ) {
        colorFactor = 0.05;
    } else {
        colorFactor = (1 - (camera.position.z - minZ) / (maxZ - minZ));
    }

    const currentColor = colorWhite.clone().lerp(colorBlack, colorFactor);
    scene.background = currentColor;
}

function startScaleUp(object, scaleFactor = 0.1) {
    if (!object.userData.isScalingUp && !object.userData.isScalingDown) {
      object.userData.isScalingUp = true;
      object.userData.scaleStartTime = Date.now();
      if (!object.userData.originalScale) {
        object.userData.originalScale = object.scale.clone();
      }
      object.userData.scaleFactor = scaleFactor; // 여기에 scaleFactor를 저장합니다.
    }
}

function update() {
    const currentTime = Date.now();

    scene.children.forEach(child => {
        if (child.userData.isScalingUp) {
            const elapsedTime = currentTime - child.userData.scaleStartTime;
            if (elapsedTime < scaleUpDuration) {
                const scaleFraction = elapsedTime / scaleUpDuration;
                const targetScale = child.userData.originalScale.clone().multiplyScalar(child.userData.scaleFactor); // 변경됨
                child.scale.lerpVectors(child.userData.originalScale, targetScale, scaleFraction);
            } else {
                child.userData.isScalingUp = false;
                child.userData.isScalingDown = true; // 확대가 완료된 후 축소를 시작
                child.userData.scaleStartTime = currentTime;
            }
        } else if (child.userData.isScalingDown) {
            const elapsedTime = currentTime - child.userData.scaleStartTime;
            if (elapsedTime < scaleDownDuration) {
                const scaleFraction = elapsedTime / scaleDownDuration;
                const targetScale = child.userData.originalScale.clone().multiplyScalar(child.userData.scaleFactor); // 변경됨
                child.scale.lerpVectors(targetScale, child.userData.originalScale, scaleFraction);
            } else {
                child.scale.copy(child.userData.originalScale);
                child.userData.isScalingDown = false;
            }
        }
    });
}

function animate() {

    requestAnimationFrame(animate);

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.name === 'color' || intersectedObject.name === 'img') {
            if (!intersectedObject.userData.isScalingUp && !intersectedObject.userData.isScalingDown) {
                // Start scaling up only if not already scaling up or down
                startScaleUp(intersectedObject, 1.5);
                if (intersectedObject.userData.relatedSprite) {
                    startScaleUp(intersectedObject.userData.relatedSprite, 1.5);
                }
            }
        }
    }
    updateCircleSpriteSizes();
    updatePointsAnimation();
    updateBackgroundColor(); 

    // clampCameraZ(camera, -1000, 3000); 
    TWEEN.update()
    update();
    render();
}

function render() {
    composer.render();
}
