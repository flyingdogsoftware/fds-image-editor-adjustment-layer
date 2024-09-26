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
        layer.data=getScene()
    }
    onMount(() => {
        return () => {
            _destroy()
        }
    })    
    

    // eslint-disable-next-line no-unused-vars
    export async function prepareForAI(resultLayer) {
      
    }
    export function getScene() {
        let sceneData=JSON.parse(JSON.stringify(layer))
        return sceneData
    }
    export async function setScene(sceneInfo) {
        let data=sceneInfo
        for(let key in data) {
            layer[key]=data[key]
        }
        refresh()
    }
    export function layerInstance() {
        class adjustmentLayer extends globalThis.gyre.getLayerBaseClass() {
            background_type
            workflow
            workflowData
            formData
            workflowid
            workflowname
        }
        let newlayer=new adjustmentLayer()
        newlayer.type = 'fds-image-editor-adjustment-layer'
        newlayer.name = 'Adjustment'
        newlayer.letter = "A"
        newlayer.background_type = 'transparent'
        newlayer.workflow="",
        newlayer.workflowData={}
        return newlayer
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
    let gyre = globalThis.gyre

    let layers = gyre.layerManager.getLayersSameGroup(layer.id)
    if (!layers || layers.length === 1) return // nothing below adjustment layer -> do nothing

    let list = [];
    for (let i = layers.length - 1; i >= 0; i--) { // get all layers with image (url) in it below adjustment layer
        let l = layers[i];
        if (l.id === layer.id) break;
        if (l.url && (l.visible || l.type==="mask" || layer.mergeNum==1)) list.unshift(l)    // mask layer or just one layer can be invisible 
    }
    if (layer.mergeNum!=="all" && list.length > layer.mergeNum) {
      list = list.slice(0, layer.mergeNum)
    }
    if (!list.length) return
    showProgress = true
    await tick()
    if (list[0].type==="mask") {    // special case: adjustment layer on mask
        list = list.slice(0, 1) // only one layer
        layer.mergeNum=1        
    }
    if (list[0].type==="mask") {
        mergedImageURL=await getMaskLayer(list[0])  // mask only
    } else {
        mergedImageURL = await mergeLayers(list, gyre.canvas) // get merged image of n layers below
    }

    

    // eslint-disable-next-line no-unused-vars
    let callBack_files = async (callbacktype, name, v2, v3, v4) => { // callback for getting files from mappings
        console.log(callbacktype, name)    // add layer image support here
        if (callbacktype === "getLayerImage" && name === "currentLayer") {
            return await mergedImageURL
        }
    }

    let callback_error = async (nodeName) => {
        console.log("Error at " + nodeName);
    }

    let data = gyre.ComfyUI.convertFormData(layer.formData);
    data.currentLayer = "empty"; // !important: set default empty values for files for calling callbacks

    let executeWorkflow = () => {
        // eslint-disable-next-line no-unused-vars
        return new Promise((resolve, reject) => {
            let callback_finished = async (result) => {
                let img = result[0].mime + ";charset=utf-8;base64," + result[0].base64;

                if (list[0].type==="mask") {    // mask
                    layer.url=img
                    layer.ref=list[0].id  // link this new layer to the mask layer
                    layer.refType="moveTool"
                } else {    // image
                    // apply alpha channel and masks to result
                    if (layer.no_preserve_transparency) {
                        layer.url = img
                    } else {
                        layer.url = await gyre.imageAPI.applyAlphaChannel(img, mergedImageURL)
                    }                    
                }
                showProgress = false
                let component = layer.element.getElementsByTagName("fds-image-editor-adjustment-layer")[0]
                component.refresh()
                resolve()
            };

            gyre.ComfyUI.executeWorkflowById(layer.workflowid, callback_finished, callBack_files, data, callback_error);
        });
    };

    await executeWorkflow()
  }
  async function getMaskLayer(layer) {
    return layer.url
  }
  async function mergeLayers(layers, canvasObject) {
    // Create an off-screen canvas
    const offScreenCanvas = window.document.createElement('canvas')
    offScreenCanvas.width = canvasObject.width
    offScreenCanvas.height = canvasObject.height
    const context = offScreenCanvas.getContext('2d')

    // Clear the off-screen canvas
    context.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);

    // Iterate over the layers starting from the bottom layer
    let start=layers.length - 1 // all layers below
    // render layers, plan to replace by main API function as new mask handling is coming
    for (let i = start; i >= 0; i--) {
        const layer = layers[i]
        
        context.save()

        // Draw the image or canvas
        if (layer.canvas) {
            // Check if the layer has a rotation parameter
            if (layer.rotation) {
                context.globalAlpha = layer.opacity / 100
                // Move the context origin to the center of the image or canvas to rotate around its center
                const centerX = layer.x + layer.width / 2
                const centerY = layer.y + layer.height / 2                
                context.translate(centerX, centerY)
                context.rotate(layer.rotation )
                context.translate(-centerX, -centerY)
            }            
            context.drawImage(layer.canvas.canvas.canvasList[0], layer.x, layer.y, layer.width, layer.height)  // just canvas on canvas
        } else {
            context.drawImage(await globalThis.gyre.imageAPI.loadImage(await layer.renderInDocumentSize()), 0, 0,canvasObject.width, canvasObject.height) // using layer API here with mask support
        }
        
        // Restore the context to its original state
        context.restore()
    }

    // Convert the off-screen canvas to a data URL and return it
    return offScreenCanvas.toDataURL()
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

