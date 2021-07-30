// SETUP [

var engine;
var scene;
var canvas;

var xrInited

async function setup() {

    canvas = document.getElementById("renderCanvas");

    //var engine = null;
    //var scene = null;
    var sceneToRender = null;
    var createDefaultEngine = function() { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true,  disableWebGL2Support: false}); };

    initFunction = async function() {               
        var asyncEngineCreation = async function() {
            try {
                return createDefaultEngine();
            } catch(e) {
                console.log("the available createEngine function failed. Creating the default engine instead");
                return createDefaultEngine();
            }
        }

        engine = await asyncEngineCreation();
        
        if (!engine) 
            throw 'engine should not be null.';
        
        scene = init()
    };
    
    initFunction().then(() => {
        scene.then(returnedScene => { sceneToRender = returnedScene; });
            
        engine.runRenderLoop(function () {
            if (sceneToRender && sceneToRender.activeCamera) {
                sceneToRender.render();
            }
        });
    });

    // Resize
    window.addEventListener("resize", function () {
        engine.resize();
    });
}

// SETUP ]

async function setupAR(scene) {

    if (xrInited)
        return scene
    xrInited = true

    // AR availability check and GUI in non-AR mode
    let arAvailable = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');

    arAvailable = true;

    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "FullscreenUI"
    );

    var rectangle = new BABYLON.GUI.Rectangle("rect");
    rectangle.background = "#040";
    rectangle.color = "blue";
    rectangle.width = "70%";
    rectangle.height = "30%";

    advancedTexture.addControl(rectangle);
    var nonXRPanel = new BABYLON.GUI.StackPanel();
//    rectangle.addControl(nonXRPanel);

    if (!arAvailable) {
        const text1 = new BABYLON.GUI.TextBlock("text1");
        text1.fontFamily = "Helvetica";
        text1.textWrapping = true;
        text1.text = "AR is not available in your system. Please make sure you use a supported mobile device such as a modern Android device and a supported browser like Chrome.";
        text1.color = "white";
        text1.fontSize = "20px";
        text1.height = "100px"

        text1.paddingLeft = "10px";
        text1.paddingRight = "10px";
        nonXRPanel.addControl(text1);

        const text2 = new BABYLON.GUI.TextBlock("text1");
        text2.fontFamily = "Helvetica";
        text2.textWrapping = true;
        text2.text = "Make sure you have Google AR services installed and that you enabled the WebXR incubation flag under chrome://flags";
        text2.color = "white";
        text2.fontSize = "20px";
        text2.height = "100px";
        text2.paddingLeft = "10px";
        text2.paddingRight = "10px";
        nonXRPanel.addControl(text2);
        return null;
    } else {
        const text1 = new BABYLON.GUI.TextBlock("text1");
        text1.fontFamily = "Helvetica";
        text1.textWrapping = true;
        text1.text = "Welcome to RFMR Game! Please enter AR mode";
        text1.color = "white";
        text1.fontSize = "14px";
        text1.height = "400px"

        text1.paddingLeft = "10px";
        text1.paddingRight = "10px";
        nonXRPanel.addControl(text1);
    }

    // Create the WebXR Experience Helper for an AR Session (it initializes the XR scene, creates an XR Camera, 
    // initialize the features manager, create an HTML UI button to enter XR,...)
    var xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: "immersive-ar",
            referenceSpaceType: "local-floor",
            onError: (error) => {
                alert(error);
            }
        },
        optionalFeatures: true
    });

    //Hide GUI in AR mode
    xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
        rectangle.isVisible = false;
    })
    xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
        rectangle.isVisible = true;
    })

    return xr;
}

// SCENE [


/***************************************************
 * WebXR AR demo with Particle Systems and hit-test
 * ************************************************
 * 
 * Working (at the moment) on android devices and the latest chrome and Google VR Services installed.
 *
 * 
 * - Once in AR, look at the floor or at a flat surface for a few seconds (and move a little): the hit-testing ring will appear.
 * - Then, if the ring is displayed, the first press on the screen will add an Orb made of 4 Particle Systems in the requested position. 
 * - The Orb will be kept in place by the AR system you are using.
 * - It will "blossom" when you get closer to it (<3m).
 * 
 * 
 * Created by @thomlucc, based on example from Raanan Weber (@RaananW).
 * Details about how to create the Orb: https://babylonjs.medium.com/visual-effects-with-particles-a-guide-for-beginners-5f322445388d
 */

var createScene = async function () {

    // Creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // Creates and positions a free camera (non-mesh)
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 1, -5), scene);

    // Cargets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // Attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // Creates lights
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    var dirLight = new BABYLON.DirectionalLight("dirlight", new BABYLON.Vector3(0, -1, -0.5), scene);
    dirLight.position = new BABYLON.Vector3(0, 5, -5);

    // XR [

    let xr = await setupAR(scene);
    if (!xr) {
        return;
    }
    return scene

    // Get the Feature Manager and from it the HitTesting fearture 
    const fm = xr.baseExperience.featuresManager;
    const xrTest = fm.enableFeature(BABYLON.WebXRHitTest.Name, "latest");

    // Get XR Camera Created by Basic Experience Helper 
    const xrCamera = xr.baseExperience.camera

    // XR ]

    // TORUS [

    //Create a marker that will be used to represent the hitTest position
    const marker = BABYLON.MeshBuilder.CreateTorus('marker', { diameter: 0.15, thickness: 0.05, tessellation: 32 });
    marker.isVisible = false;
    marker.rotationQuaternion = new BABYLON.Quaternion();

    var matStd = new BABYLON.StandardMaterial("matstd", scene);
    matStd.diffuseTexture = new BABYLON.Texture("textures/albedo.png", scene);
    matStd.diffuseTexture.uScale = .5;
    matStd.diffuseTexture.vScale = .5;
    marker.material = matStd;

    // TORUS ]

    // Update the position/rotation of the marker with HitTest information
    let hitTest;
    xrTest.onHitTestResultObservable.add((results) => {
        if (results.length) {
            marker.isVisible = true;
            hitTest = results[0];
            hitTest.transformationMatrix.decompose(undefined, marker.rotationQuaternion, marker.position);
        } else {
            marker.isVisible = false;
            hitTest = undefined;
        }
    });
/*
    // Create the first two particle systems that will be updated later
    var orbCore = await BABYLON.ParticleHelper.CreateFromSnippetAsync("EXUQ7M#5", scene);
    orbCore.stop();
    var orbSparks = await BABYLON.ParticleHelper.CreateFromSnippetAsync("UY098C#3", scene);
    orbSparks.stop();
    var sphereSpark = BABYLON.MeshBuilder.CreateSphere("sphereSpark", { diameter: 0.4, segments: 32 }, scene);
    sphereSpark.isVisible = false;

    // Create/update the Orb's particles systems at the hitTest Position
    var orbAppearded = false;
    var coreAppeared = false;
    const orbPositionOffSet = 1.2;

    scene.onPointerDown = (evt, pickInfo) => {

        if (hitTest && xr.baseExperience.state === BABYLON.WebXRState.IN_XR && !orbAppearded) {

            //The Orb is made of 4 Particle systems
            // 1st Particle Sytem - Circles
            BABYLON.ParticleHelper.CreateFromSnippetAsync("2JRD1A#2", scene, false).then(system => {
                let circlePosition = new BABYLON.Vector3();
                hitTest.transformationMatrix.decompose(undefined, undefined, circlePosition);
                circlePosition = circlePosition.add(new BABYLON.Vector3(0, orbPositionOffSet, 0));
                system.emitter = circlePosition;
            });

            // 2nd Particle Sytem - Core
            let corePosition = new BABYLON.Vector3();
            hitTest.transformationMatrix.decompose(undefined, undefined, corePosition);
            corePosition = corePosition.add(new BABYLON.Vector3(0, orbPositionOffSet, 0));
            orbCore.emitter = corePosition;

            // 3rd Particle Sytem - Sparks
            orbSparks.emitter = sphereSpark;
            hitTest.transformationMatrix.decompose(undefined, sphereSpark.rotationQuaternion, sphereSpark.position);
            let direction = new BABYLON.Vector3(0, 1, 0);
            sphereSpark.translate(direction, orbPositionOffSet, BABYLON.Space.LOCAL);
            orbSparks.maxEmitPower = 10;
            orbSparks.start();

            // 4th Particle Sytem - Smoke
            var sphereSmoke = BABYLON.MeshBuilder.CreateSphere("sphereSmoke", { diameter: 1.8, segments: 32 }, scene);
            sphereSmoke.isVisible = false;
            BABYLON.ParticleHelper.CreateFromSnippetAsync("UY098C#6", scene, false).then(system => {
                system.emitter = sphereSmoke;
                hitTest.transformationMatrix.decompose(undefined, sphereSmoke.rotationQuaternion, sphereSmoke.position);
                let direction = new BABYLON.Vector3(0, 1, 0);
                sphereSmoke.translate(direction, orbPositionOffSet, BABYLON.Space.LOCAL);
            });

            orbAppearded = true;
        }
    }
*/
    // RENDER LOOP [

    //Rendering loop 
    scene.onBeforeRenderObservable.add(() => {
/*
        //Calculate distance between XRCamera and the Orb
        var distanceToOrb = sphereSpark.position.subtract(xrCamera.position).length();
        const distanceBlossom = 3

        if (orbAppearded) marker.isVisible = false;

        //Make the Orb blossom when we (the XRcamera) get close to it    
        if (orbAppearded && !coreAppeared && (distanceToOrb < distanceBlossom)) {
            orbCore.start();
            coreAppeared = true;
            orbSparks.emitRate = 1500;
        }
        else {
            orbCore.stop();
            coreAppeared = false;
            orbSparks.emitRate = 40;
        }
        */


//        box.position.x += 0.0001;

    });

    // RENDER LOOP ]
    // PLANE [

//    const plane = BABYLON.Mesh.CreatePlane("plane", size, scene);
//    const plane = BABYLON.Mesh.CreatePlane("plane", size, scene, updatable, sideOrientation); //optional parameters after scene

    const Mesh = BABYLON.Mesh
    

//    var options = {width:1, height:1}
    var size = 5;

    const plane = BABYLON.Mesh.CreatePlane("plane", size, scene);
///    const plane = BABYLON.Mesh.CreatePlane("plane", {}, scene);

//    plane.position = new BABYLON.Vector3(5, 5, -5);
//    plane.position = new BABYLON.Vector3(0, 5, -5);
    plane.position = new BABYLON.Vector3(0, 0, 5);

//    plane.sideOrientation = Mesh.DOUBLESIDE
//    plane.rotation = new BABYLON.Vector3(3, 2, 5);

//    plane.position.subtract(xrCamera.position).length();

    // PLANE ]

    var box = BABYLON.MeshBuilder.CreateBox("box", {}, scene);
//    box.material = matStd;
    box.position = new BABYLON.Vector3(0, 5, 7);

//    var ground = BABYLON.MeshBuilder.CreateGround("gd", {width: 6, subdivsions: 4}, scene);

    //        var plane1 = BABYLON.Mesh.CreatePlane("plane1", 1);
    //        plane1.position = new BABYLON.Vector3(0.0, 1.5, 0.4)

/*
var plane = BABYLON.Mesh.CreatePlane("plane", 350, scene);
plane.position.y = -5;
plane.rotation.x = Math.PI / 2;
box.rotation.y = Math.PI / 4;
box.rotation.y = BABYLON.Tools.ToRadians(45);
box.scaling.x = 2;
box.scaling.y = 1.5;
box.scaling.z = 3;
*/

    var options1 = {
        width: 512,
        height: 256
    }
    var label1 = createLabel("label1", "Falcon1", options1, scene);
//    label1.position = new BABYLON.Vector3(0, 5, 200);
    label1.position = new BABYLON.Vector3(0, 0, 4);
    label1.scaling = new BABYLON.Vector3(0.01, 0.01, 1);

    return scene;

};

// SCENE ]
// TEXT LABEL 1 [

function createLabel(name, text, options, scene) {

    var font_type = "Arial";

    //Create plane
    var plane = BABYLON.MeshBuilder.CreatePlane("plane", options, scene);

    //Set width and height for dynamic texture using same multiplier
    var DTWidth = options.width;
    var DTHeight = options.height;
    
    //Create dynamic texture
    var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", {width:DTWidth, height:DTHeight}, scene);

    //Check width of text for given font type at any size of font
    var ctx = dynamicTexture.getContext();
    var size = 12; //any value will work
    ctx.font = size + "px " + font_type;
    var textWidth = ctx.measureText(text).width;
    
    //Calculate ratio of text width to size of font used
    var ratio = textWidth/size;
    
    //set font to be actually used to write text on dynamic texture
    var font_size = Math.floor(DTWidth / (ratio * 1)); //size of multiplier (1) can be adjusted, increase for smaller text
    var font = font_size + "px " + font_type;
    
    //Draw text
    dynamicTexture.drawText(text, null, null, font, "#000000", "#ffff00", true);

    //create material
    var mat = new BABYLON.StandardMaterial("mat", scene);
    mat.diffuseTexture = dynamicTexture;
    
    //apply material
    plane.material = mat;

    return plane
}

// TEXT LABEL 1 ]
// BUTTONS 1 [

var createScene2 = async function () {
    var scene = new BABYLON.Scene(engine);
    var camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 2, 10, BABYLON.Vector3.Zero());

    camera.wheelDeltaPercentage = 0.01;
    camera.attachControl(canvas, true);

    // Create the 3D UI manager
    var manager = new BABYLON.GUI.GUI3DManager(scene);

    // Create a horizontal stack panel
    var panel = new BABYLON.GUI.SpherePanel();
  
    manager.addControl(panel);
    panel.position.z = -1.5;

    // Let's add some buttons!
    var addButton = function() {
        var button = new BABYLON.GUI.HolographicButton("orientation");
        panel.addControl(button);

        button.text = "Button #" + panel.children.length;
    }

    panel.blockLayout = true;
    for (var index = 0; index < 60; index++) {
        addButton();    
    }
    panel.blockLayout = false;

    return scene;

};

// BUTTONS 1 ]
// SCENE 3 [

var createScene3 = async function () {

    var scene = new BABYLON.Scene(engine);
//    scene.clearColor = new BABYLON.Color3(0.0, 0.0, 0.0);


    var light = new BABYLON.HemisphericLight("Hemi", new BABYLON.Vector3(0, 1, 0), scene);
    light.groundColor = new BABYLON.Color3(1, 0, 0);

    var camera = new BABYLON.ArcRotateCamera("Camera", -.8, 1.3, 65, new BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas);

    let xr = await setupAR(scene);
    if (!xr) {
        return;
    }

    // Mirrors
    var tile1 = BABYLON.Mesh.CreatePlane("tile1", 70, scene);
    tile1.position.y = -15;
    tile1.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
    tile1.showBoundingBox = true;
/*
    var tile2 = BABYLON.Mesh.CreatePlane("tile2", 70, scene);
    tile2.position = new BABYLON.Vector3(0, 20, 35);
    tile2.rotation = new BABYLON.Vector3(Math.PI, Math.PI, 0);
    tile2.showBoundingBox = true;

    var tile3 = BABYLON.Mesh.CreatePlane("tile3", 70, scene);
    tile3.position = new BABYLON.Vector3(-35, 20, 0);
    tile3.rotation = new BABYLON.Vector3(Math.PI, Math.PI/2, 0);
    tile3.showBoundingBox = true;
*/

    // Emitters
    var emitter0 = BABYLON.Mesh.CreateBox("emitter0", 2, scene);
    emitter0.position.y = 2;
    emitter0.isVisible = true;
    emitter0.material = new BABYLON.StandardMaterial("emat", scene);
    emitter0.material.diffuseColor = BABYLON.Color3.Blue();

    //Creation of mirror materials
    var mirrorMaterial1 = new BABYLON.StandardMaterial("texture4", scene);
    mirrorMaterial1.diffuseColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial1.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial1.reflectionTexture = new BABYLON.MirrorTexture("mirror", 1024, scene, true); //Create a mirror texture
    mirrorMaterial1.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, -1.0, 0, -5.0);
    mirrorMaterial1.reflectionTexture.renderList = [emitter0];
    mirrorMaterial1.reflectionTexture.level = 1; //Select the level (0.0 > 1.0) of the reflection

    var mirrorMaterial2 = new BABYLON.StandardMaterial("texture6", scene);
    mirrorMaterial2.diffuseColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial2.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial2.reflectionTexture = new BABYLON.MirrorTexture("mirror2", 1024, scene, true);
    mirrorMaterial2.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, 0, 1, -10.0);
    mirrorMaterial2.reflectionTexture.renderList = [emitter0];
    mirrorMaterial2.reflectionTexture.level = 1;

    var mirrorMaterial3 = new BABYLON.StandardMaterial("texture6", scene);
    mirrorMaterial3.diffuseColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial3.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial3.reflectionTexture = new BABYLON.MirrorTexture("mirror2", 1024, scene, true);
    mirrorMaterial3.reflectionTexture.mirrorPlane = new BABYLON.Plane(-1, 0, 0, -10.0);
    mirrorMaterial3.reflectionTexture.renderList = [emitter0];
    mirrorMaterial3.reflectionTexture.level = 1;

    //Applying materials
    tile1.material = mirrorMaterial1;
/*
    tile2.material = mirrorMaterial2;
    tile3.material = mirrorMaterial3;
*/
    // Particles
    var particleSystem = new BABYLON.ParticleSystem("particles", 50000, scene);

    // particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", scene);
    particleSystem.particleTexture = new BABYLON.Texture("http://i166.photobucket.com/albums/u83/j1m68/star.jpg", scene);

    particleSystem.minSize = 0.01;
    particleSystem.maxSize = 2;
    particleSystem.minLifeTime = 10;
    particleSystem.maxLifeTime = 10;
    particleSystem.minEmitPower = 2;
    particleSystem.maxEmitPower = 2;

/*
    particleSystem.color1 = new BABYLON.Color4(1, 0, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(0, 1, 0, 1);
    particleSystem.colorDead = new BABYLON.Color4(1, 1, 1, 1);
*/

    particleSystem.minAngularSpeed = -5;
    particleSystem.maxAngularSpeed = 5;
    particleSystem.emitter = emitter0;

    particleSystem.emitRate = 20;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

    particleSystem.direction1 = new BABYLON.Vector3(-.3, 1, -.3);
    particleSystem.direction2 = new BABYLON.Vector3(.3, 1, .3);

    particleSystem.gravity = new BABYLON.Vector3(0, -.1, 0);
    particleSystem.start();

// -----------------------------------------------------------------------------------------------------------------------
    var randomNumber = function (min, max) {
        if (min == max) {
            return (min);
        }

        var random = Math.random();

        return ((random * (max - min)) + min);
    };
// -----------------------------------------------------------------------------------------------------------------------
    var doubleColor4 = function (min, max) {
        return new BABYLON.Color4(Math.random()*2, Math.random()*2, Math.random()*2, Math.random());
    }
// -----------------------------------------------------------------------------------------------------------------------

    // animation
    var animate = function() {
        emitter0.rotation.y += .1;
        particleSystem.color1 = new BABYLON.Color4(Math.random(), Math.random(), Math.random(), 1);
        particleSystem.color2 = new BABYLON.Color4(Math.random(), Math.random(), Math.random(), 1);
        particleSystem.colorDead = new BABYLON.Color4(Math.random(), Math.random(), Math.random(), 1);
    }

    scene.registerBeforeRender(animate);

    return scene;
};

// SCENE 3 ]
// SCENE 4 [

async function createScene4(scene)
{
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera(
       "Camera", Math.PI / 4, Math.PI / 4, 4, BABYLON.Vector3.Zero(), scene);

    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    BABYLON.Effect.ShadersStore["customVertexShader"] = "\r\n" + 
       "precision highp float;\r\n" + 
       "// Attributes\r\n" + 
       "attribute vec3 position;\r\n" + 
       "attribute vec2 uv;\r\n" + 
       "// Uniforms\r\n" + 
       "uniform mat4 worldViewProjection;\r\n" + 

       "// Varying\r\n" + 
       "varying vec2 vUV;\r\n" + 
       "void main(void) {\r\n" + 
          "gl_Position = worldViewProjection * vec4(position, 1.0);\r\n" + 
          "vUV = uv;\r\n"+"       }       \r\n";
       BABYLON.Effect.ShadersStore["customFragmentShader"] = "\r\n"+
          "precision highp float;\r\n" + 
          "varying vec2 vUV;\r\n" + 
          "uniform sampler2D textureSampler;\r\n" + 
       "void main(void) {          \r\n"+
          "gl_FragColor = texture2D(textureSampler, vUV);\r\n"+"       }       \r\n";

    //

//    BABYLON.Effect.ShadersStore["customFragmentShader"] = $('#shader1').text()
    BABYLON.Effect.ShadersStore["customFragmentShader"] = $('#shader2').text()

    var shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
        vertex: "custom",
        fragment: "custom",
    }, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "iTime"]
    });

//    shaderMaterial.AddUniform('iTime', 'float');
//    mainMaterial.AddUniform('radius', 'float');
//    mainMaterial.AddUniform('radiusVariationAmplitude', 'float');
//    mainMaterial.AddUniform('radiusNoiseFrequency', 'float');
    let initTime = new Date()
    shaderMaterial.onBind = () => {
        let time = (+new Date() - initTime) * .001;
        shaderMaterial.getEffect().setFloat('iTime', time);//time);
//        shaderMaterial.getEffect().setFloat('iTime', Math.random()*100);//time);

//        mainMaterial.getEffect().setFloat('radius', radius);
//        mainMaterial.getEffect().setFloat('radiusVariationAmplitude', 0.75);
//        mainMaterial.getEffect().setFloat('radiusNoiseFrequency', 0.5);
    };

    var mainTexture = new BABYLON.Texture("images/mat.jpg", scene);

    shaderMaterial.setTexture("textureSampler", mainTexture);

    shaderMaterial.backFaceCulling = false;

//    var box = BABYLON.MeshBuilder.CreateBox("box", {}, scene);
//    box.material = shaderMaterial;


    const plane = BABYLON.Mesh.CreatePlane("plane", 5, scene);
    plane.position = new BABYLON.Vector3(0, 0, 5);
    plane.material = shaderMaterial

    return scene;
}

// SCENE 4 ]
// SCENE 5 [

var createScene5 = async function() {
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera("Camera", -3*Math.PI/8,  3*Math.PI/8, 80, BABYLON.Vector3.Zero(), scene);

    camera.attachControl(canvas, false);
    
    // lights
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(50, 50, 0), scene);
    light.intensity = 0.8;
    
    
    //creates a coordinate system 
    var coordSystem = function(vec3) {  //vec3 none zero Vector3				
        var y_ = vec3.normalize();
        if(Math.abs(vec3.x) == 0 && Math.abs(vec3.y) == 0) {
            var x_ = new BABYLON.Vector3(vec3.z, 0, 0).normalize();
        }
        else {
            var x_ = new BABYLON.Vector3(vec3.y, -vec3.x, 0).normalize();
        }
        var z_ = BABYLON.Vector3.Cross(x_, y_);
        return{x:x_, y:y_, z:z_};
    }

    //randomize a value v +/- p*100% of v
    var r_pct = function(v, p) {
        if(p==0) {
            return v;
        }
        
        return (1 + (1 - 2*Math.random())*p)*v;
    }
    
    var green = new BABYLON.StandardMaterial("green", scene);
    //green.emissiveColor = new BABYLON.Color3(0,1,0);
    green.diffuseColor = new BABYLON.Color3(0,1,0);
    
    var dark_green = new BABYLON.StandardMaterial("dark_green", scene);
    dark_green.emissiveColor = new BABYLON.Color3(1,1,0.25);
    dark_green.diffuseColor = new BABYLON.Color3(1,1,0.25);
    
    //Texture for tree
    var bark = new BABYLON.StandardMaterial("bark", scene);
    bark.emissiveTexture = new BABYLON.Texture("https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Bark_texture_wood.jpg/800px-Bark_texture_wood.jpg", scene);
    bark.diffuseTexture = new BABYLON.Texture("https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Bark_texture_wood.jpg/800px-Bark_texture_wood.jpg", scene);
    bark.diffuseTexture.uScale = 2.0;//Repeat 5 times on the Vertical Axes
    bark.diffuseTexture.vScale = 2.0;//Repeat 5 times on the Horizontal Axes
    bark.specularColor = new BABYLON.Color3(0,0,0);
    
    //Texture for ground
    var grass = new BABYLON.StandardMaterial("grass", scene);
    grass.diffuseTexture = new BABYLON.Texture("textures/grass.jpg", scene);
    grass.diffuseTexture.uScale = 5.0;//Repeat 5 times on the Vertical Axes
    grass.diffuseTexture.vScale = 5.0;//Repeat 5 times on the Horizontal Axes
    
    var PHI = 2/(1+Math.sqrt(5)); //golden ratio for scale				
    
    var uv=[];
            
    var createBranch = function(branch_at, branch_sys, branch_length, branch_taper, branch_slices, bow_freq, bow_height, cross_section_radius) {                                                          
        //cross section in the branch_sys.x and branch_sys.z plane to extrude in the branch_sys.y direction
        var cross_section_paths =  [];
        var core_point;
        var core_path = [];                
        var path;
        var xsr;
        var radii = [];
        var a_sides = 12;
        for(var a = 0; a<a_sides; a++) {
            cross_section_paths[a] = [];
        }	
        
        var d_slices = 20;
        var d_slices_length;									
                        
        for(var d = 0; d<branch_slices; d++) {
            d_slices_length = d/branch_slices;	
            core_point = branch_sys.y.scale(d_slices_length*branch_length);
            //add damped wave along branch 
            core_point.addInPlace(branch_sys.x.scale(bow_height*Math.exp(-d_slices_length)*Math.sin(bow_freq*d_slices_length*Math.PI)));		
            //set core start at spur position.
            core_point.addInPlace(branch_at);
            core_path[d] = core_point;
            
            //randomize radius by +/- 40% of radius and taper to branch_taper*100% of radius  at top							
            xsr = cross_section_radius*(1 + (0.4*Math.random() - 0.2))*(1 - (1-branch_taper)*d_slices_length);	
            radii.push(xsr);
        
            for(var a = 0; a<a_sides; a++) {
                theta = a*Math.PI/6;					
                //path followed by one point on cross section in branch_sys.y direction
                path = branch_sys.x.scale(xsr*Math.cos(theta)).add(branch_sys.z.scale(xsr*Math.sin(theta)));
                //align with core
                path.addInPlace(core_path[d]);
                cross_section_paths[a].push(path);                                                        							
            }
        
        }

        //cap end
        for(var a = 0; a<a_sides; a++) {
            cross_section_paths[a].push(core_path[core_path.length-1]);
        } 
        
        var branch = BABYLON.MeshBuilder.CreateRibbon("branch", {pathArray: cross_section_paths, closeArray:true}, scene);
        branch.material = bark;	

        return {branch:branch, core:core_path, radii:radii};
    } 
    
    var createTreeBase = function(trunk_height, trunk_taper, trunk_slices, boughs, forks, fork_angle, fork_ratio, bow_freq, bow_height) {                                                   
        var trunk_direction = new BABYLON.Vector3(0, 1, 0);
        
        var branch;
        
        var trunk_sys = coordSystem(trunk_direction);                    
        var trunk_root_at = new BABYLON.Vector3(0, 0, 0);
        var tree_branches = [];
        var tree_paths = [];
        var tree_radii = [];
        var tree_directions = [];
        
        var trunk = createBranch(trunk_root_at, trunk_sys, trunk_height, trunk_taper, trunk_slices, 1, bow_height, 1); 
        tree_branches.push(trunk.branch);
        var core_path = trunk.core;
        tree_paths.push(core_path);
        tree_radii.push(trunk.radii);
        tree_directions.push(trunk_sys);
        
        var core_top = core_path.length - 1;
        var top_point = core_path[core_top];

        var fork_turn = 2*Math.PI/forks;

        var fork_branch_direction, fork_branch_sys, fork_core;
        var bough_direction, bough_sys, bough_core_path;
        var turn, bough_turn, bough_top, bough;
        for(var f=0; f<forks; f++) {                       
            turn = r_pct(f*fork_turn, 0.25);						
            fork_branch_direction = trunk_sys.y.scale(Math.cos(r_pct(fork_angle,0.15))).add(trunk_sys.x.scale(Math.sin(r_pct(fork_angle,0.15))*Math.sin(turn))).add(trunk_sys.z.scale(Math.sin(r_pct(fork_angle,0.15))*Math.cos(turn)));
            fork_branch_sys = coordSystem(fork_branch_direction);                       										 
            branch = createBranch(top_point, fork_branch_sys, trunk_height*fork_ratio, trunk_taper, trunk_slices, bow_freq, bow_height*PHI, trunk_taper);
            bough_core_path = branch.core;
            bough_top = bough_core_path[bough_core_path.length - 1];
            tree_branches.push(branch.branch);
            tree_paths.push(branch.core);
            tree_radii.push(branch.radii);
            tree_directions.push(fork_branch_sys);
            if(boughs > 1) {
                for(var k =0; k<forks; k++) {
                    bough_turn = r_pct(k*fork_turn, 0.25);
                    bough_direction = fork_branch_sys.y.scale(Math.cos(r_pct(fork_angle,0.15))).add(fork_branch_sys.x.scale(Math.sin(r_pct(fork_angle,0.15))*Math.sin(bough_turn))).add(fork_branch_sys.z.scale(Math.sin(r_pct(fork_angle,0.15))*Math.cos(bough_turn)));
                    bough_sys = coordSystem(bough_direction);                       										 
                    bough = createBranch(bough_top, bough_sys, trunk_height*fork_ratio*fork_ratio, trunk_taper, trunk_slices, bow_freq, bow_height*PHI*PHI, trunk_taper*trunk_taper);
                    tree_branches.push(bough.branch);
                    tree_paths.push(bough.core);
                    tree_radii.push(branch.radii);
                    tree_directions.push(bough_sys);
                }
            }    
        }
        var tree = BABYLON.Mesh.MergeMeshes(tree_branches);
        return {tree:tree, paths:tree_paths, radii:tree_radii, directions:tree_directions};
    }

    var createTree = function(trunk_height, trunk_taper, trunk_slices, boughs, forks, fork_angle, fork_ratio, bow_freq, bow_height, leaves_on_branch, leaf_wh_ratio) {                    
        if(!(boughs ==1 || boughs ==2)) {
            boughs = 1;
        }                    
        var base = createTreeBase(trunk_height, trunk_taper, trunk_slices, boughs, forks, fork_angle, fork_ratio, bow_freq, bow_height);                    
        var branch_length = trunk_height*Math.pow(fork_ratio, boughs);
        var leaf_gap = branch_length/(2 * leaves_on_branch);
        var leaf_width = 1.5*Math.pow(trunk_taper, boughs - 1);
        var leaf = BABYLON.MeshBuilder.CreateDisc("leaf", {radius: leaf_width/2, tessellation:12, sideOrientation:BABYLON.Mesh.DOUBLESIDE}, scene );
        //leaf.scaling.y = 1/leaf_wh_ratio;
        var leaves_SPS = new BABYLON.SolidParticleSystem("leaveSPS", scene, {updatable: false});
        var set_leaves = function(particle, i, s) {
            var a = Math.floor(s/(2*leaves_on_branch));
            if(boughs == 1) {
                a++;
            }
            else {
                a = 2 + a % forks + Math.floor(a / forks)*(forks + 1);
            }
            var j = s % (2*leaves_on_branch);
            var g =(j*leaf_gap + 3*leaf_gap/2)/branch_length; 
            //var gp =((j - 1)*leaf_gap + 3*leaf_gap/2)/branch_length;                                             
            var upper = Math.ceil(trunk_slices*g);                      
            if(upper > base.paths[a].length - 1) {
                upper = base.paths[a].length - 1;
            }
            var lower = upper - 1; 
            var gl = lower/(trunk_slices - 1);
            var gu = upper/(trunk_slices - 1);                     
            var px = base.paths[a][lower].x  + (base.paths[a][upper].x - base.paths[a][lower].x)*(g - gl)/(gu - gl);
            var py = base.paths[a][lower].y  + (base.paths[a][upper].y - base.paths[a][lower].y)*(g - gl)/(gu - gl);
            var pz = base.paths[a][lower].z  + (base.paths[a][upper].z - base.paths[a][lower].z)*(g - gl)/(gu - gl);                                                                                             
            particle.position = new BABYLON.Vector3(px, py + (0.6*leaf_width/leaf_wh_ratio + base.radii[a][upper])*(2*(s % 2) - 1), pz); 
            particle.rotation.z = Math.random()*Math.PI/4 ;
            particle.rotation.y = Math.random()*Math.PI/2 ;
            particle.rotation.z = Math.random()*Math.PI/4 ;
            particle.scale.y = 1/leaf_wh_ratio;
        }
        
        leaves_SPS.addShape(leaf, 2*leaves_on_branch*Math.pow(forks, boughs), {positionFunction:set_leaves});                  
        var leaves = leaves_SPS.buildMesh();
        leaves.material = green;
        leaves.billboard = true;
        leaf.dispose();
        var axis_y = new BABYLON.Vector3(0, 1, 0);
        var mini_trees_SPS = new BABYLON.SolidParticleSystem("miniSPS", scene, {updatable: false});
        var mini_leaves_SPS = new BABYLON.SolidParticleSystem("minileavesSPS", scene, {updatable: false});
        var turns = [];
        var fork_turn = 2*Math.PI/forks;
        for(var f=0; f<Math.pow(forks, boughs + 1); f++) {
            turns.push(r_pct(Math.floor(f / Math.pow(forks, boughs)) * fork_turn, 0.2))
        }

        var set_mini_trees = function(particle, i, s) {
            var a = s % Math.pow(forks, boughs);
            if(boughs == 1) {
                a++;
            }
            else {
                a = 2 + a % forks + Math.floor(a / forks)*(forks + 1);
            }
            var mini_sys = base.directions[a];                     
            var mini_top = new BABYLON.Vector3(base.paths[a][base.paths[a].length - 1].x, base.paths[a][base.paths[a].length - 1].y, base.paths[a][base.paths[a].length - 1].z);                       
            var turn = turns[s];                                             
            var mini_direction = mini_sys.y.scale(Math.cos(r_pct(fork_angle,0))).add(mini_sys.x.scale(Math.sin(r_pct(fork_angle,0))*Math.sin(turn))).add(mini_sys.z.scale(Math.sin(r_pct(fork_angle,0))*Math.cos(turn)));
            var axis  = BABYLON.Vector3.Cross(BABYLON.Axis.Y, mini_direction);
            var theta = Math.acos(BABYLON.Vector3.Dot(mini_direction, BABYLON.Axis.Y)/mini_direction.length());
            particle.scale = new BABYLON.Vector3(Math.pow(trunk_taper, boughs + 1), Math.pow(trunk_taper, boughs + 1), Math.pow(trunk_taper, boughs + 1));
            particle.quaternion = BABYLON.Quaternion.RotationAxis(axis, theta);
            particle.position = mini_top;   
        }
        
        turns = [];
        var places =[];
        var bplen = base.paths.length;
        var bp0len = base.paths[0].length;
        for(var b=0; b<branches; b++) {
            turns.push(2*Math.PI*Math.random() - Math.PI);
            places.push([Math.floor(Math.random()*bplen), Math.floor(Math.random()*(bp0len - 1) + 1)] )
        }
        
        var setBranches = function(particle, i, s) {                       
            var a = places[s][0];
            var b = places[s][1];                        
            var mini_sys = base.directions[a];                       
            var mini_place = new BABYLON.Vector3(base.paths[a][b].x, base.paths[a][b].y, base.paths[a][b].z);
            mini_place.addInPlace(mini_sys.z.scale(base.radii[a][b]/2));                        
            var turn = turns[s];                                             
            var mini_direction = mini_sys.y.scale(Math.cos(r_pct(branch_angle,0))).add(mini_sys.x.scale(Math.sin(r_pct(branch_angle,0))*Math.sin(turn))).add(mini_sys.z.scale(Math.sin(r_pct(branch_angle,0))*Math.cos(turn)));
            var axis  = BABYLON.Vector3.Cross(BABYLON.Axis.Y, mini_direction);
            var theta = Math.acos(BABYLON.Vector3.Dot(mini_direction, BABYLON.Axis.Y)/mini_direction.length());
            particle.scale = new BABYLON.Vector3(Math.pow(trunk_taper, boughs + 1), Math.pow(trunk_taper, boughs + 1), Math.pow(trunk_taper, boughs + 1));
            particle.quaternion = BABYLON.Quaternion.RotationAxis(axis, theta);                      
            particle.position = mini_place;                     
        }
                            
        mini_trees_SPS.addShape(base.tree, Math.pow(forks, boughs + 1), {positionFunction:set_mini_trees});
        mini_trees_SPS.addShape(base.tree, branches, {positionFunction:setBranches});
        var tree_crown = mini_trees_SPS.buildMesh();
        tree_crown.material = bark;
        mini_leaves_SPS.addShape(leaves, Math.pow(forks, boughs + 1), {positionFunction:set_mini_trees});
        mini_leaves_SPS.addShape(leaves, branches, {positionFunction:setBranches});                   
        var leaves_crown = mini_leaves_SPS.buildMesh();
        leaves.dispose();
        leaves_crown.material = green;
        
        var root = BABYLON.MeshBuilder.CreateBox("", {}, scene);
        root.isVisible = false;
        base.tree.parent = root;
        tree_crown.parent = root;
        leaves_crown.parent = root;
        
        return root;
    }
    
    
    var trunk_height = 20;
    var trunk_taper = 0.6;
    var trunk_slices = 5;
    var boughs = 2; // 1 or 2
    var forks = 4;
    var fork_angle = Math.PI/4;
    var fork_ratio = PHI;
    var branch_angle = Math.PI/3;
    var bow_freq = 2;
    var bow_height = 3.5;
    var branches = 40;
    var leaves_on_branch = 5;
    var leaf_wh_ratio = 0.5;
    
    var tree = createTree(trunk_height, trunk_taper, trunk_slices, boughs, forks, fork_angle, fork_ratio, bow_freq, bow_height, leaves_on_branch, leaf_wh_ratio);				               
    tree.position.y = -10;

    return scene;
};

// SCENE 5 ]
// INIT [

async function init() {
//            scene = await createScene();
//            let scene = await createScene2();
//    let scene = await createScene3();
    let scene = await createScene4();
//    let scene = await createScene5();


    let xr = await setupAR(scene);
    if (!xr) {
        return;
    }
    return scene
}

window.onload = function ()
{
   setup();
//    setup1()
}

async function setup1() {
    canvas = document.getElementById("renderCanvas");
    engine = new BABYLON.Engine(canvas, true);
    
//    var scene = await createScene4();
    let scene = await createScene5();

    let xr = await setupAR(scene);
    if (!xr) {
//        return;
    }
    engine.runRenderLoop(function() {
        scene.render();
    });
}

// INIT ]
