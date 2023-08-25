import { useEffect } from 'react'
import './App.css'
import * as THREE from 'three';
import {
  useAudio,
  useWebSocket
} from "tryvoice"

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'



let textMesh;
// Set our main variables
let scene,
  renderer,
  camera,
  model, // Our character
  neck, // Reference to the neck bone in the skeleton
  waist, // Reference to the waist bone in the skeleton
  possibleAnims, // Animations found in our file
  mixer, // THREE.js animations mixer
  idle, // Idle, the default state our character returns to
  clock = new THREE.Clock(), // Used for anims, which run to a clock instead of frame rate 
  currentlyAnimating = false, // Used to check whether characters neck is being used in another anim
  raycaster = new THREE.Raycaster() // Used to detect the click on our character
// loaderAnim = document.getElementById('js-loader');




function App() {
  const {
    audioLoader,

    micAudio,
    audioReceive,

    resetBase64StringStreamAudio,

    startRecording,
    stopRecording,
    mediaRecorder,
    // setMediaRecorder,
    // setSumRecording,

    noSpeech,
    recognitionTranscript,
    // sumRecording,
    recordingDone,
    dataavailable,


    actionStop,
    actionStart,
    actionPause
  } = useAudio()


  const {
    socket,
    ONstarted,
    connectSocket,

    upload,
    ONtextTranscriptNotVoice,
    ONtextTranscript,
    ONtextResponse,
    ONhistoricUpdate,
    ONaudio,

    disconnect,
    ONtextSpeech,

  } = useWebSocket()


  const START = async () => {
    await actionStart()
    await SEND_TEXT_SPEECH()
  }

  const STOP = async () => {
    await actionStop()
  }

  const PAUSE = async () => {
    await actionPause()
  }

  const SEND = async () => {
    stopRecording(mediaRecorder)
  }

  const SEND_TEXT_SPEECH = async () => {
    await ONtextSpeech({
      voice: 'pt-BR-Standard-B',
      text: null

    })
  }

  useEffect(() => {
    if (noSpeech) {

      ONtextSpeech({
        voice: 'pt-BR-Standard-B',
        text: "Tente falar mais proximo do microfone e nitidamente."
      })

    }
  }, [noSpeech])

  useEffect(() => {
    (async () => {
      try {

        const socket = await connectSocket({ host: 'http://192.168.0.108:3000', sub: '341964aa-f385-4489-878a-6db0a8798901', token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6IC…Bi87QsfSvMK8SX6GJX2o5uGpo9oCgyoCOZ_1VsbCDUHsU4JYQ' })


        return () => socket.disconnect();

      } catch (e) {
        console.error(e)
      }
    })()
  }, [
    // initialized, keycloak, keycloak?.token
  ]);





  useEffect(() => {
    try {

      if (!socket) return;

      console.log('sss', socket)

      ONstarted(async () => {
        await resetBase64StringStreamAudio()
        // audioLoad(audioLoader, 'assets/audios/junggle__btn402.wav')

      })

      ONtextTranscriptNotVoice(async () => {

        // audioLoad(audioLoader, 'assets/audios/junggle__btn402.wav')
        startRecording()
        await resetBase64StringStreamAudio()

        console.log('ONtextTranscriptNotVoice: ', ONtextTranscriptNotVoice)

      })

      ONtextTranscript(async (text) => {
        console.log('ONtextTranscript: ', {
          msg: text,
          from: 'me'
        })
      })

      ONtextResponse((text) => {
        console.log('ONtextResponse: ', {
          msg: text,
          from: 'them'
        })

        createOrUpdateText(text)
      })

      ONhistoricUpdate((data) => {
        console.log('ONHISTORICUPDATE: ', data.id)
      })

      ONaudio(async (data) => {

        await resetBase64StringStreamAudio()

        const blob = new Blob([data]);
        const audioUrlReceive = URL.createObjectURL(blob);
        audioReceive.current.src = audioUrlReceive;
        audioReceive.current.play();

        console.log("ONaudio: ", data)

        playOnClick()

      })



      disconnect(() => console.log('websocket disconnect'))

    } catch (err) {
      console.error(err)
    }
  }, [socket]);



  useEffect(() => {


    dataavailable(async (BUFFER) => {

      await Promise.all([
        upload({
          modelAi: 'Friend chat',
          coreAiCurrent: 'chatgpt',
          interationID: '3333333',
          LANGUAGE_CODE: (navigator.language || navigator.userLanguage),
          base64StringStreamAudio: BUFFER,
          recognitionTranscript,
          voiceCurrent: 'pt-BR-Standard-B'
        }),
        resetBase64StringStreamAudio()
      ])


    })



  }, [mediaRecorder, recognitionTranscript, recordingDone])





  function init() {

    const MODEL_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';
    // const MODEL_PATH = './static/exo.glb';
    const canvas = window.document.querySelector('#c');
    const backgroundColor = `#333`;

    // Init the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(backgroundColor, 60, 100);

    // Init the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    // document.body.appendChild(renderer.domElement);

    // Add a camera
    camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000);

    camera.position.z = 30;
    camera.position.x = 0;
    camera.position.y = -3;

    let stacy_txt = new THREE.TextureLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg');
    stacy_txt.flipY = false;

    const stacy_mtl = new THREE.MeshPhongMaterial({
      map: stacy_txt,
      color: 0xffffff,
      skinning: true
    });



    var loader = new GLTFLoader();

    loader.load(
      MODEL_PATH,
      function (gltf) {
        model = gltf.scene;
        let fileAnimations = gltf.animations;

        model.traverse(o => {

          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material = stacy_mtl;
          }
          // Reference the neck and waist bones
          if (o.isBone && o.name === 'mixamorigNeck') {
            neck = o;
          }
          if (o.isBone && o.name === 'mixamorigSpine') {
            waist = o;
          }
        });

        model.scale.set(17, 17, 17);
        model.position.y = -28;

        scene.add(model);

        // loaderAnim.remove();

        mixer = new THREE.AnimationMixer(model);

        let clips = fileAnimations.filter(val => val.name !== 'idle');

        console.log("clips: ", clips)


        possibleAnims = clips.map(val => {
          let clip = THREE.AnimationClip.findByName(clips, val.name);

          clip.tracks.splice(3, 3);
          clip.tracks.splice(9, 3);

          clip = mixer.clipAction(clip);
          return clip;
        });


        let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');

        idleAnim.tracks.splice(3, 3);
        idleAnim.tracks.splice(9, 3);

        idle = mixer.clipAction(idleAnim);
        idle.play();

      },
      undefined, // We don't need this function
      function (error) {
        console.error(error);
      });


    // Add lights
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
    hemiLight.position.set(0, 50, 0);
    // Add hemisphere light to scene
    scene.add(hemiLight);

    let d = 8.25;
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
    dirLight.position.set(-8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = d * -1;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = d * -1;
    // Add directional Light to scene
    scene.add(dirLight);


    // Floor
    let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    let floorMaterial = new THREE.MeshPhongMaterial({
      color: `#292929`,
      shininess: 0
    });


    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.y = -11;
    scene.add(floor);

    // Criando um cubo
    const geometry = new THREE.BoxGeometry(8, 2);
    const material = new THREE.MeshBasicMaterial({ color: `#f2f2f2` });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.z = -15;
    cube.position.y = 2;
    cube.position.x = 7.25;

    scene.add(cube);


    createOrUpdateText('Hi Boy!')

  }



  useEffect(() => {
    init()
    update();

  }, [])



  function updateText() {
    const newText = prompt("Digite o novo texto:");
    if (newText) {
      createOrUpdateText(newText);
    }
  }


  // Função para criar ou atualizar o texto
  function createOrUpdateText(text) {

    if (textMesh) {
      scene.remove(textMesh);
    }


    console.log('THREE: ', THREE)
    const loaderFont = new FontLoader();
    loaderFont.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json', function (font) {
      const textGeometry = new TextGeometry(text, {
        font: font,
        size: 0.5,
        height: 0.1,
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color: `#333` });
      textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(3.7, 1.7, -14); // Ajuste a posição do texto conforme necessário
      scene.add(textMesh);
    });
  }


  function update() {
    if (mixer) {
      mixer.update(clock.getDelta());
    }

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }





  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let canvasPixelWidth = canvas.width / window.devicePixelRatio;
    let canvasPixelHeight = canvas.height / window.devicePixelRatio;

    const needResize =
      canvasPixelWidth !== width || canvasPixelHeight !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  // window.addEventListener('click', e => raycast(e));
  // window.addEventListener('touchend', e => raycast(e, true));

  function raycast(e, touch = false) {
    var mouse = {};
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects[0]) {
      var object = intersects[0].object;

      if (object.name === 'stacy') {

        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playOnClick();
        }
      }
    }
  }

  // Get a random animation, and play it 
  function playOnClick() {
    let anim = Math.floor(Math.random() * possibleAnims.length) + 0;
    playModifierAnimation(idle, 0.25, possibleAnims[anim], 0.25);
  }

  function playModifierAnimation(from, fSpeed, to, tSpeed) {
    to.setLoop(THREE.LoopOnce);
    to.reset();
    to.play();
    from.crossFadeTo(to, fSpeed, true);
    setTimeout(function () {
      from.enabled = true;
      to.crossFadeTo(from, tSpeed, true);
      currentlyAnimating = false;
    }, to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000);
  }








  return (
    <>

      <div className="wrapper" >
        <canvas id="c"></canvas>
      </div>

      <div className="frame">
        <audio ref={micAudio} controls id="micAudio"></audio>
        <audio ref={audioReceive} id="audioReceive" controls></audio>
        <audio ref={audioLoader} id="audioLoader" controls></audio>
        <h1>{recognitionTranscript}</h1>
        <div>
          <button onClick={START}>START</button>
          <button onClick={STOP}>STOP</button>
          <button onClick={PAUSE} >PAUSE</button>
          <button onClick={SEND} >SEND</button>
        </div>
        <div className="dialog">
          <div>
            <button id="updateText">Update Text</button>
          </div>
        </div>
      </div>

    </>
  )
}

export default App
