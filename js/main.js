clock = new THREE.Clock();
// Tiles that sit next to a tile of a greater scale need to have their edges morphed to avoid
// edges. Mark which edges need morphing using flags. These flags are then read by the vertex
// shader which performs the actual morph
var Edge = {
    NONE: 0,
    TOP: 1,
    LEFT: 2,
    BOTTOM: 4,
    RIGHT: 8
};

function init(heights, dataWidth, dataDepth, hmin, hmax) {
    Data.img = null;

    // worldDataWidth = dataWidth;
    // worldDataDepth = dataDepth;

    World.initializeScene();

    World.initializeRenderer();

    Controls.initializeCamera(
        World.center.x,//World.offset.x + (0.43 * World.size.x),//0,//
        World.center.y,//World.offset.y + (0.33 * World.size.y),//0,//
        World.size.y
    );

    Controls.initializeControls();

    //

    Controls.signalRequestStart();
    Texture.loader.load(
        'data/2/374_31.png',
        function (bumpTexture) {
            Texture.loader.load(
                Texture.generateUrl(World.d96tm2d48gk([World.offset.x,World.offset.y]), World.d96tm2d48gk([(World.offset.x + World.size.x),(World.offset.y+World.size.y)]), [2048, 2048], 'jpg'),
                function (ortofotoTexture) {

                    var createTile = function ( x, y, scale, edgeMorph ) {
                        var terrainMaterial = createTerrainMaterial(
                            bumpTexture,
                            World.center,
                            World.cameraOffset,
                            new THREE.Vector2( x, y ),
                            scale,
                            resolution,
                            edgeMorph
                        );
                        var plane = new THREE.Mesh( tileGeometry, terrainMaterial );

                        // Disable frustum culling to prevent the mesh from dissappearing at certain angles
                        // See: https://stackoverflow.com/questions/21184061/mesh-suddenly-disappears-in-three-js-clipping
                        plane.frustumCulled = false;

                        World.terrain.add( plane );
                    };

                    var createTerrainMaterial = function( heightData, globalOffset, cameraOffset, offset, scale, resolution, edgeMorph ) {
                        // Is it bad to change this for every tile?
                        //terrainVert.define( "TILE_RESOLUTION", resolution.toFixed(1) );
                        return new THREE.ShaderMaterial( {//THREE.MeshLambertMaterial({//
                            uniforms: {
                                uEdgeMorph: { type: "i", value: edgeMorph },
                                uGlobalOffset: { type: "v3", value: globalOffset },
                                uCameraOffset: { type: "v2", value: cameraOffset },
                                uHeightData: { type: "t", value: heightData },
                                //uGrass: { type: "t", value: texture.grass },
                                uOrtoFoto: { type: "t", value: ortofotoTexture },
                                //uSnow: { type: "t", value: texture.snow },
                                uTileOffset: { type: "v2", value: offset },
                                uScale: { type: "f", value: scale }
                            },
                            vertexShader: document.getElementById( 'vertexShader'   ).textContent,
                            fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
                            wireframe: true
                        } );
                    };

                    bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;

                    var levels = 9;
                    var resolution = 32;

                    // Offset is used to re-center the terrain, this way we get the greates detail
                    // nearest to the camera. In the future, should calculate required detail level per tile
                    World.cameraOffset = new THREE.Vector2(0, 0);

                    // Create geometry that we'll use for each tile, just a standard plane
                    var tileGeometry = new THREE.PlaneGeometry( 1, 1, resolution, resolution );
                    // Place origin at bottom left corner, rather than center
                    var m = new THREE.Matrix4();
                    m.makeTranslation( 0.5, 0.5, 0 );
                    tileGeometry.applyMatrix( m );

                    // Create collection of tiles to fill required space
                    var initialScale = World.size.x / Math.pow( 2, levels );

                    // Create center layer first
                    //    +---+---+
                    //    | O | O |
                    //    +---+---+
                    //    | O | O |
                    //    +---+---+
                    createTile(-initialScale, -initialScale, initialScale, Edge.NONE);
                    createTile(-initialScale, 0, initialScale, Edge.NONE);
                    createTile(0, 0, initialScale, Edge.NONE);
                    createTile(0, -initialScale, initialScale, Edge.NONE);

                    // Create "quadtree" of tiles, with smallest in center
                    // Each added layer consists of the following tiles (marked 'A'), with the tiles
                    // in the middle being created in previous layers
                    // +---+---+---+---+
                    // | A | A | A | A |
                    // +---+---+---+---+
                    // | A |   |   | A |
                    // +---+---+---+---+
                    // | A |   |   | A |
                    // +---+---+---+---+
                    // | A | A | A | A |
                    // +---+---+---+---+
                    for (var scale = initialScale; scale < World.size.x; scale *= 2) {
                        createTile( -2 * scale, -2 * scale, scale, Edge.BOTTOM | Edge.LEFT );
                        createTile( -2 * scale, -scale, scale, Edge.LEFT );
                        createTile( -2 * scale, 0, scale, Edge.LEFT );
                        createTile( -2 * scale, scale, scale, Edge.TOP | Edge.LEFT );

                        createTile( -scale, -2 * scale, scale, Edge.BOTTOM );
                        // 2 tiles 'missing' here are in previous layer
                        createTile( -scale, scale, scale, Edge.TOP );

                        createTile( 0, -2 * scale, scale, Edge.BOTTOM );
                        // 2 tiles 'missing' here are in previous layer
                        createTile( 0, scale, scale, Edge.TOP );

                        createTile( scale, -2 * scale, scale, Edge.BOTTOM | Edge.RIGHT );
                        createTile( scale, -scale, scale, Edge.RIGHT );
                        createTile( scale, 0, scale, Edge.RIGHT );
                        createTile( scale, scale, scale, Edge.TOP | Edge.RIGHT );

                        // resolution /= 2;
                        // tileGeometry = new THREE.PlaneGeometry( 1, 1, resolution, resolution );
                    }

                    World.scene.add(World.terrain);
                    console.log(World.terrain.position);

                    // axes

                    // var axes = new THREE.AxisHelper( World.size.y );
                    // World.scene.add( axes );

                    container.innerHTML = "";

                    container.appendChild( World.renderer.domElement );

                    stats = new Stats();
                    container.appendChild( stats.dom );

                    //

                    window.addEventListener( 'resize', onWindowResize, false );

                    Controls.signalRequestEnd();

                    animate();
                }
            );
        }
    );
}

function onWindowResize() {
    Controls.camera.aspect = window.innerWidth / window.innerHeight;
    Controls.camera.updateProjectionMatrix();

    World.renderer.setSize( window.innerWidth, window.innerHeight );
}

//

function animate() {
    requestAnimationFrame( animate );

    render();
    stats.update();

    //LOD.update();
}

function render() {
    Controls.controls.update( clock.getDelta() );

    if (
        World.terrain.position.x !== (Controls.controls.target.x - World.center.x) ||
        World.terrain.position.y !== (Controls.controls.target.y - World.center.y)
    ) {
        World.terrain.position.x = Controls.controls.target.x - World.center.x;
        World.terrain.position.y = Controls.controls.target.y - World.center.y;

        // Update camera offset in shaders
        World.cameraOffset.x = World.terrain.position.x;
        World.cameraOffset.y = World.terrain.position.y;
        for(var i = 0; i < World.terrain.children.length; i++) {
            World.terrain.children[i].material.uniforms.uCameraOffset.value = World.cameraOffset;
        }
    }

    World.renderer.render( World.scene, Controls.camera );
}

init();