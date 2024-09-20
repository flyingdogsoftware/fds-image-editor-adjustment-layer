<svelte:options tag="fds-image-editor-adjustment-layer-toolbar" />

<script>
    import {  onMount } from "svelte"

  export let layer = {}

  onMount(async () => {
    paletteValues=globalThis.gyre.paletteValues
    if (!paletteValues.adjustment_layer_update) paletteValues.adjustment_layer_update="never"
    if (!layer.mergeNum) layer.mergeNum="all"
    refresh()
	})
   /**
   * put all available workflows in menu structure
   */ 
  function convertToMenuStructure(array) {
    const menu = {};

    array.forEach((item) => {
      const categoryKey = item.category.toLowerCase() + "Menu"
      const itemKey = item.name.replace(/\s+/g, "").toLowerCase()
      if (!menu[categoryKey]) {
        menu[categoryKey] = {
          name: item.category,
          items: {},
        };
      }

      menu[categoryKey].items[itemKey] = {
        workflowid: item.workflowid,
        name: item.name,
      }
    })
    return menu
  }
  let observerID
  // eslint-disable-next-line no-unused-vars
  async function observerCallBack(changes) {
    await executeAll()
  }
  function openMenu() {
    var contextMenu = window.document.createElement("fds-image-editor-menu");
    contextMenu.menu = menu;
    contextMenu.element = selectButton;
    contextMenu.callback = (item) => {
        layer.workflowid=item.workflowid
        layer.workflowname=item.name
        layer.no_preserve_transparency=item.no_preserve_transparency
        layer.formData={}
        layer.name=item.name
        layer=layer        
        globalThis.gyre.layerManager.selectLayers([layer.id])
        if (globalThis.gyre.paletteValues.adjustment_layer_update && globalThis.gyre.paletteValues.adjustment_layer_update!=="never") {
          observerID=globalThis.gyre.layerManager.observeChangesSameGroup(layer.id,observerCallBack,parseInt(globalThis.gyre.paletteValues.adjustment_layer_update))
        }
        // open dialog
        openProperties()
//      
    }
    document.body.append(contextMenu)
  }
  function openProperties() {
    globalThis.gyre.openDialogById(layer.workflowid,layer.formData,layer.workflowname,(newData) => { console.log("new formdata"); layer.formData=newData;})
  }
  export async function executeAll() {
    let gyre=globalThis.gyre

    let layers=gyre.layerManager.getLayersSameGroup(layer.id)
    if (!layers || layers.length===1) return  // nothing below adjustment layer -> do nothing
    for(let i=layers.length-1;i>=0;i--) {      // get all adjustment layer in stack
      let l=layers[i]
      if (l.type==="fds-image-editor-adjustment-layer" && l.visible) {
        let component = l.element.getElementsByTagName("fds-image-editor-adjustment-layer")[0]
        await component.execute()
      }

    }
  }

  // helper function see below
  function countResultImageUsage(data) {
    let count = 0
    for (let key in data.mappings) {
      // eslint-disable-next-line no-prototype-builtins
      if (data.mappings.hasOwnProperty(key)) {
        data.mappings[key].forEach(mapping => {
          if (mapping.fromField === "resultImage") {
            count++
          }
        })
      }
    }
    return count
  }

  let menu = {};
  export function refresh() {
    if (!globalThis.gyre) return;
    let gyre = globalThis.gyre;
    if (!gyre.ComfyUI || !gyre.ComfyUI.workflowList) return
    // get all layer workflows which are active
    let layerWFs = gyre.ComfyUI.workflowList.filter((el) => {
        let gyreobj = JSON.parse(el.json).extra.gyre;
        if (!gyreobj.tags || !gyreobj.tags.includes("LayerMenu")) return false
        if (gyreobj.tags && gyreobj.tags.includes("Deactivated")) return false
        if (!gyreobj.category) gyreobj.category = "Other"
        // needs currentLayer (= merged images of all layers below here)
        if (!gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","currentLayer")) return false
        // layer below or above can not work here
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","nextLayer")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","layerBelow")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","previousLayer")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","layerAbove")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"drop_layers")) return false // support later
        let num=countResultImageUsage(gyreobj)
        if (num!==1) return false // only one result image is allowed here
        return true
      }).map((el) => {
        let gyreobj = JSON.parse(el.json).extra.gyre;
        return {
          name: el.name,
          category: gyreobj.category,
          workflowid: gyreobj.workflowid,
          no_preserve_transparency: gyreobj.no_preserve_transparency
        }
      })
    menu = convertToMenuStructure(layerWFs)
  }
  function changeInterval(e) {
    if (e.target.value==="never") {
      globalThis.gyre.layerManager.deleteObserver(observerID)
      return
    }
    observerID=globalThis.gyre.layerManager.observeChangesSameGroup(layer.id,observerCallBack,parseInt(e.target.value))

  }

 let paletteValues
  let selectButton

</script>

<div>
  {#if !layer.workflowid}
    <fds-image-editor-button icon="fds-image-editor-adjustment-layer-icon" type="icon" class="icon"></fds-image-editor-button>

      Adjustment Layer:
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <fds-image-editor-button
        type="button"
        on:click={openMenu}
        bind:this={selectButton}>Select Workflow...</fds-image-editor-button
      >
   {:else}
      <fds-image-editor-button icon="fds-image-editor-adjustment-layer-icon" type="icon" class="icon"></fds-image-editor-button>

      Adjustment Layer:
      {layer.workflowname} 
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <fds-image-editor-button
        type="button"
        on:click={openProperties}
        bind:this={selectButton}>Properties...</fds-image-editor-button
      >    

      &nbsp; 
      <select
      class="formInput"
      bind:value={layer.mergeNum}
      name="num_layers"
    >
      <option value="all">All layers below</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>


      {#if paletteValues}
        &nbsp;  <select
        class="formInput"
        on:change={changeInterval}
        bind:value={paletteValues.adjustment_layer_update}
        name="adjustment_layer_update"
      >
        <option value="never">No auto update</option>
        <option value="250">250ms</option>
        <option value="500">500ms</option>
        <option value="1000">1s</option>
        <option value="2000">2s</option>
        <option value="5000">5s</option>
        <option value="10000">10s</option>
      </select>

      {#if  paletteValues.adjustment_layer_update==="never"}
      &nbsp;
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <fds-image-editor-button
        type="button"
        state="active"
        on:click={executeAll}
        bind:this={selectButton}>Update Now</fds-image-editor-button
      >        
      {/if}
    {/if}
  {/if}

</div>
<style>
  .icon {
    vertical-align: -10px;
  }
  .formInput {
        display:inline-block;
        outline: 0;
        border: 0;
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        margin-bottom: 10px;
        padding: 5px;
        font-size: 14px;
        font-weight: normal;
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.9);
        font-family: system-ui, 'Segoe UI', Roboto;
        background: black;
    }  
    .toggle {
      vertical-align: -10px;
    }
</style>