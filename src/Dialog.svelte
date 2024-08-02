<svelte:options tag="fds-image-editor-adjustment-layer-toolbar" />

<script>

  export let layer = {};
  function convertToMenuStructure(array) {
    const menu = {};

    array.forEach((item) => {
      const categoryKey = item.category.toLowerCase() + "Menu";
      const itemKey = item.name.replace(/\s+/g, "").toLowerCase();

      if (!menu[categoryKey]) {
        menu[categoryKey] = {
          name: item.category + " Options",
          items: {},
        };
      }

      menu[categoryKey].items[itemKey] = {
        workflowid: item.workflowid,
        name: item.name,
      };
    });
    return menu;
  }
  function openMenu() {
    var contextMenu = window.document.createElement("fds-image-editor-menu");
    contextMenu.menu = menu;
    contextMenu.element = selectButton;
    contextMenu.callback = (name, p, item) => {
        layer.workflowid=item.workflowid
        layer.workflowname=item.name
        layer.formData={}
        layer=layer        
        // open dialog
        openProperties()
//       
    }
    document.body.append(contextMenu)
  }
  function openProperties() {
    globalThis.gyre.openDialogById(layer.workflowid,layer.formData,layer.workflowname,(newData) => { layer.formData=newData;})
  }
  export function executeAll() {
    let gyre=globalThis.gyre

    let layers=gyre.layerManager.getLayersSameLevel(layer.id)
    if (!layers || layers.length===1) return  // nothing below adjustment layer -> do nothing
    for(let i=layers.length-1;i>=0;i--) {      // get all adjustment layer in stack
      let l=layers[i]
      if (l.type==="fds-image-editor-adjustment-layer") {
        let component = layer.element.getElementsByTagName("fds-image-editor-adjustment-layer")[0]
        component.execute()
      }

    }
  }


  

  let menu = {};
  export function refresh() {
    if (!globalThis.gyre) return;
    let gyre = globalThis.gyre;
    if (!gyre.ComfyUI || !gyre.ComfyUI.workflowList) return;
    // get all layer workflows which are active
    let layerWFs = gyre.ComfyUI.workflowList.filter((el) => {
        let gyreobj = JSON.parse(el.json).extra.gyre;
        if (!gyreobj.tags || !gyreobj.tags.includes("LayerMenu")) return false;
        if (gyreobj.tags && gyreobj.tags.includes("Deactivated")) return false;
        if (!gyreobj.category) gyreobj.category = "Other";
        return true;
      }).map((el) => {
        let gyreobj = JSON.parse(el.json).extra.gyre;
        return {
          name: el.name,
          category: gyreobj.category,
          workflowid: gyreobj.workflowid,
        }
      })
    menu = convertToMenuStructure(layerWFs)
  }



  let selectButton

</script>

<div>
  {#if !layer.workflowid}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <fds-image-editor-button
      type="button"
      on:click={openMenu}
      bind:this={selectButton}>Select Workflow...</fds-image-editor-button
    >
    {:else}
    Adjustment Layer:
    {layer.workflowname} 
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <fds-image-editor-button
      type="button"
      on:click={openProperties}
      bind:this={selectButton}>Properties...</fds-image-editor-button
    >    
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <fds-image-editor-button
      type="button"
      state="active"
      on:click={executeAll}
      bind:this={selectButton}>Update Layers</fds-image-editor-button
    >        

  {/if}
  
</div>
