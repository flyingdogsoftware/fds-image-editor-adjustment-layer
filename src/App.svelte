<svelte:options tag="fds-image-editor-adjustment-layer"></svelte:options>
<script>
    import { onMount } from "svelte"
    // needed otherwise it will be not availabe in bundle
    // eslint-disable-next-line no-unused-vars
    import Dialog from './Dialog.svelte'
    import {  tick } from "svelte"

    /**
     * width of canvas
     * @type {integer}
     */
    export let width=500
    /**
     * height of canvas
     * @type {integer}
     */    
    export let height=500
    /**
     * layer object
     */
    export let layer={} 

    export function refresh() {
        layer=layer
    }



    function _destroy() {
      //  layer.data=getScene()  no binary data to save here
    }
    onMount(() => {
        return () => {
            _destroy()
        }
    })    
    

    export async function prepareForAI(resultLayer) {
      
    }


    export function addLayer(newlayer) {
        newlayer.type = 'fds-image-editor-adjustment-layer'
        newlayer.name = 'Adjustment'
        newlayer.letter = "A"
        newlayer.background_type = 'transparent'
        newlayer.workflow="",
        newlayer.workflowData={}
    }

    export async function prepareForSave() {
        let copy=JSON.parse(JSON.stringify(layer))
        copy.url=null
        return copy
    }

    export function getLayerMenuHTML(l,thumbclass,thumbStyle) {
        if (!layer.workflowid) l.name="Select Workflow..."
        // justr render a T as thumb. Could be an image as well
        let html=
            '<div ' +
            thumbclass +
            ' style="' +
            thumbStyle +
            ' font-size:33px;font-weight:bold;display:flex;align-content:space-between;justify-content:space-around;align-items: center;">'
            +'<fds-image-editor-button icon="fds-image-editor-adjustment-layer-icon" type="icon"></fds-image-editor-button>'
            + '</div> ' +
            l.name
        return html
    }

    export async function quickMask() {

        return null
    }
    let mergedImageURL
  export async function execute() {
    if (!layer.formData) return
    let gyre = globalThis.gyre;

    let layers = gyre.layerManager.getLayersSameLevel(layer.id);
    if (!layers || layers.length === 1) return; // nothing below adjustment layer -> do nothing

    let list = [];
    for (let i = layers.length - 1; i >= 0; i--) { // get all layers with image (url) in it below adjustment layer
        let l = layers[i];
        if (l.id === layer.id) break;
        if (l.url && l.visible) list.unshift(l);
    }
    if (layer.mergeNum!=="all" && list.length > layer.mergeNum) {
      list = list.slice(0, layer.mergeNum)
    }
    showProgress = true;
    await tick();

    mergedImageURL = await mergeLayers(list, gyre.canvas); // get merged image of all layers below

    let callBack_files = async (callbacktype, name, v2, v3, v4) => { // callback for getting files from mappings
        console.log(callbacktype, name);
        if (callbacktype === "getLayerImage" && name === "currentLayer") {
            return await mergedImageURL;
        }
    };

    let callback_error = async (nodeName) => {
        console.log("Error at " + nodeName);
    };

    let data = gyre.ComfyUI.convertFormData(layer.formData);
    data.currentLayer = "empty"; // !important: set default empty values for files for calling callbacks

    let executeWorkflow = () => {
        return new Promise((resolve, reject) => {
            let callback_finished = async (result) => {
                let img = result[0].mime + ";charset=utf-8;base64," + result[0].base64;
                // apply alpha channel to result
                if (layer.no_preserve_transparency) {
                    layer.url = img;
                } else {
                    layer.url = await gyre.imageAPI.applyAlphaChannel(img, mergedImageURL);
                }

                showProgress = false;
                let component = layer.element.getElementsByTagName("fds-image-editor-adjustment-layer")[0];
                component.refresh();
                resolve();
            };

            gyre.ComfyUI.executeWorkflowById(layer.workflowid, callback_finished, callBack_files, data, callback_error);
        });
    };

    await executeWorkflow();
  }

  async function mergeLayers(layers, canvasObject) {
    // Create an off-screen canvas
    const offScreenCanvas = window.document.createElement('canvas')
    offScreenCanvas.width = canvasObject.width
    offScreenCanvas.height = canvasObject.height
    const context = offScreenCanvas.getContext('2d')

    // Clear the off-screen canvas
    context.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);

    // Load an image from a URL
    function loadImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = url
      })
    }

    // Iterate over the layers starting from the bottom layer
    let start=layers.length - 1 // all layers below

    for (let i = start; i >= 0; i--) {
      const layer = layers[i]
      const img = await loadImage(layer.url)
      if (layer.canvas) {
        context.drawImage(layer.canvas.canvas.canvasList[0], layer.x, layer.y, layer.width, layer.height)
      } else {
        context.drawImage(img, layer.x, layer.y, layer.width, layer.height)
      }
    }

    // Convert the off-screen canvas to a data URL and return it
    return offScreenCanvas.toDataURL();
}
let showProgress
</script>
{#if layer.url}
    <div style="{width}px;height={height}px; position: relative">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img src={layer.url} style="width:{width}px;height={height}px"> 
    </div>
    {#if showProgress}<div style="position:absolute;left:0;top:0"><fds-image-editor-progress-bar></fds-image-editor-progress-bar></div>{/if}
{/if}

