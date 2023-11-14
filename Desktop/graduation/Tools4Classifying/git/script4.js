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

let circleRadius = 4.5;

let imgSpriteXpos = 1;
let imgSpriteZpos = 5;
const circleSprites = [];
const imgSprites = [];
const lineSprites = [];


let imgScale = 3;


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const scaleUpDuration = 150;
const scaleDownDuration = 6000;

let originalPositions = new Map();




init();


function ranNum(min, max) {
    return Math.random() * (max - min) + min;
}


document.getElementById('long').addEventListener('click', () => {
    // 현재 rotation 값을 새 객체에 저장

    randomizeSpritePositions();
});




function randomizeSpritePositions() {
    const durationTime = 6000;

    // imgSprite와 lineSprite의 이동을 동기화하기 위한 함수
    const moveSpriteToNewPosition = (sprite, newPosX, newPosZ) => {
        new TWEEN.Tween(sprite.position)
            .to({ x: newPosX, z: newPosZ }, durationTime) // durationTime 동안 이동
            .easing(TWEEN.Easing.Quadratic.Out) // 이동 시 부드럽게 처리
            .start();

        if (sprite.userData.relatedSprite) {
            // 연관된 스프라이트도 동일한 위치로 이동
            new TWEEN.Tween(sprite.userData.relatedSprite.position)
                .to({ x: newPosX, z: newPosZ }, durationTime)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    };

    circleSprites.forEach(sprite => {
        if (!originalPositions.has(sprite)) {
            // 스프라이트의 초기 위치를 저장
            originalPositions.set(sprite, { x: sprite.position.x, z: sprite.position.z });
        }

        // 스프라이트의 현재 위치가 원래 위치인지 확인
        const originalPos = originalPositions.get(sprite);
        if (sprite.position.x === originalPos.x && sprite.position.z === originalPos.z) {
            // 새로운 랜덤 위치 계산
            const newPosX = originalPos.x + ranNum(-5000, 5000); // 랜덤 범위 설정
            const newPosZ = originalPos.z + ranNum(-1000,1000);

            // TWEEN 애니메이션을 생성하고 시작합니다.
            new TWEEN.Tween(sprite.position)
                .to({ x: newPosX, z: newPosZ }, durationTime) // 2000ms 동안 이동
                .easing(TWEEN.Easing.Quadratic.Out) // 이동 시 부드럽게 처리
                .start();
        } else {
            // 원래 위치로 복귀
            new TWEEN.Tween(sprite.position)
                .to({ x: originalPos.x, z: originalPos.z }, durationTime) // 2000ms 동안 이동
                .easing(TWEEN.Easing.Quadratic.Out) // 이동 시 부드럽게 처리
                .start();
        }
    });

    // 모든 lineSprite에 대해 처리
    lineSprites.forEach(sprite => {
        if (!originalPositions.has(sprite)) {
            // 스프라이트의 초기 위치를 저장
            originalPositions.set(sprite, { x: sprite.position.x, z: sprite.position.z });
        }

        // 스프라이트의 현재 위치가 원래 위치인지 확인
        const originalPos = originalPositions.get(sprite);
        if (sprite.position.x === originalPos.x && sprite.position.z === originalPos.z) {
            // 새로운 랜덤 위치 계산
            const newPosX = originalPos.x * 5 + ranNum(-10, 10);
            const newPosZ = originalPos.z + ranNum(-1000, 1000);

            // 랜덤 위치로 이동
            moveSpriteToNewPosition(sprite, newPosX, newPosZ);
        } else {
            // 원래 위치로 복귀
            moveSpriteToNewPosition(sprite, originalPos.x, originalPos.z);
        }
    });
}



function updateSprites() {
    // img 스프라이트들을 찾아서 위치를 업데이트하는 로직
    scene.children.forEach(child => {
        if (child.name === 'img') {
            child.position.z = imgSpriteZpos; 
        }
        if (child.name === 'color') {
            child.position.z = imgSpriteZpos; 
        }
        
    });
    // 렌더링이 필요하면 렌더 함수를 호출
    render();
}


function init() {
    // Scene setup
    camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 100000);
    camera.position.z = 500;
    scene = new THREE.Scene();

    scene.rotation.x = 0; 
    scene.rotation.y = 0; 
    scene.rotation.z = 0;  
    scene.position.x = 0; 
    scene.position.y = 0;
    scene.position.z = 0;


    
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    document.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('click', onSpriteClick, false);
    




    // Load background texture
    // const loader = new THREE.TextureLoader();
    // loader.load('./sources/background1.0.png', texture => {
    //     scene.background = texture;
    // }, undefined, err => {
    //     console.error('An error happened setting the background.');
    // });

    scene.background = new THREE.Color( 'black' );

    // const loader2 = new THREE.TextureLoader();
    // loader2.load('./sources/bgLogo.png', function(texture) {
    //     // 텍스처 비율에 맞는 평면 기하체 생성
    //     const aspectRatio = texture.image.width / texture.image.height;
    //     const planeGeometry = new THREE.PlaneGeometry(aspectRatio, 1, 1, 1);

    //     // 텍스처를 사용하는 재질 생성
    //     const planeMaterial = new THREE.MeshBasicMaterial({ map: texture });

    //     // 평면 메시 생성
    //     const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        
    //     // 평면 메시 위치 및 크기 설정
    //     planeMesh.position.set(0, 0, -1); // 카메라 뒤에 위치하도록 조정
    //     planeMesh.scale.setScalar(window.innerHeight*0.75);  // 적절한 크기로 조정

    //     // 씬에 평면 메시 추가
    //     scene.add(planeMesh);
    // }, undefined, err => {
    //     console.error('An error happened setting the background.');
    // });


    // Particles setup
    setupParticles();
    

    // Camera controls
    setupCameraControls();

    // Setup EffectComposer with the passes
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    
    // Outline pass for highlighting objects
    outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    composer.addPass(outlinePass);


    // // Performance monitor
    // stats = new Stats();
    // document.body.appendChild(stats.dom);

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    animate();
}

function setupParticles() {
    const circleTexture = createCircleTexture(256, 'white', 256); // 반지름이 64px인 흰색 원
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    

    const gridWidth = 128*2; // 가로 방향 입자 수
    const gridHeight = 72*2; // 세로 방향 입자 수
    const spacing = circleRadius; // 입자 간 간격
    const zPosition = 0; // 모든 입자의 Z 위치를 고정
    
    const offsetX = - ((gridWidth - 1) * spacing) / 2;
    const offsetY = - ((gridHeight - 1) * spacing) / 2;

    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const x = offsetX + j * spacing;
            const y = offsetY + i * spacing;
            const z = zPosition; // 모든 입자의 Z 위치를 고정
            vertices.push(x, -y, z);
        }
    }

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

    // 가로와 세로에 생성할 입자의 수
    const particlesX = 128*2;
    const particlesY = 72*2;

    // 각 축에 대한 간격 계산
    const stepX = image.width / particlesX;
    const stepY = image.height / particlesY;

    // 그리드 형식으로 색상을 추출
    for (let i = 0; i < particlesY; i++) {
        for (let j = 0; j < particlesX; j++) {
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
    // 여기서부터 기존의 입자 생성 코드를 사용하고, colors 배열을 geometry에 할당
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    let occupiedPositions = {}; 

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

        for (let i = 0; i < gridHeight; i++) {
            for (let j = 0; j < gridWidth; j++) {
                const positionIndex = i * gridWidth + j;
    
                // Only create a circle sprite if the position is not occupied
                if (!occupiedPositions[positionIndex]) {

                    const x = offsetX + j * spacing;
                    const y = offsetY + i * spacing;
                    const color = new THREE.Color(colors[positionIndex * 3], colors[positionIndex * 3 + 1], colors[positionIndex * 3 + 2]);
    
                    const material = new THREE.SpriteMaterial({
                        color: color,
                        map: circleTexture,
                        transparent: true
                    });

                    const sprite = new THREE.Sprite(material);
                    sprite.name = 'circle';
                    sprite.position.set(x, -y, zPosition);
                    sprite.scale.set(circleRadius, circleRadius, 1);
                    scene.add(sprite);

                    circleSprites.push(sprite);
                    
                }
            }
            
        }
        
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
        RIGHT: THREE.MOUSE.PAN // 오른쪽 클릭을 비활성화합니다.
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


function onWindowResize() {
    // Adjust camera and renderer on window resize
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function clampCameraZ(camera, minZ, maxZ) {
    camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
}

function updateCircleSpriteSizes() {
    const minZ = 1000; // 카메라 z 최소값
    const maxZ = 2500; // 카메라 z 최대값

    circleSprites.forEach(sprite => {
        let scale;
        if (camera.position.z <= minZ) {
            scale = circleRadius;
        } else if (camera.position.z >= maxZ) {
            scale = 0;
        } else {
            // 카메라 z 값이 minZ와 maxZ 사이일 때 선형적으로 감소
            scale = circleRadius * (1 - (camera.position.z - minZ) / (maxZ - minZ));
        }
        
        sprite.scale.set(scale, scale, 1);
    });
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
    

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);

    // if (intersects.length > 0) {
    //     // Check if the name of the intersected object is 'circle'
    //     if (intersects[0].object.name === 'circle') {
    //         const intersectedObject = intersects[0].object;
    //         if (!intersectedObject.userData.isScalingUp && !intersectedObject.userData.isScalingDown) {
    //             // Start scaling up only if not already scaling up or down
    //             startScaleUp(intersectedObject);
    //         }
    //     }
    // }

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.name === 'color' || intersectedObject.name === 'img') {
            if (!intersectedObject.userData.isScalingUp && !intersectedObject.userData.isScalingDown) {
                // Start scaling up only if not already scaling up or down
                startScaleUp(intersectedObject, 1.25);
                if (intersectedObject.userData.relatedSprite) {
                    startScaleUp(intersectedObject.userData.relatedSprite, 1.25);
                }
            }
        }
    }
    updateCircleSpriteSizes();

    clampCameraZ(camera, -1000, 3000); 
    TWEEN.update()
    update();
    render();
    
}

function render() {
    composer.render();
    
    // renderer.render(scene, camera);
}
