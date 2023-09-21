function table(rootEl){
    this.root = rootEl
    this.el = this.root.querySelectorAll("tr")
    this.tr = this.el[1].cloneNode(true)
    this.th = this.el[0].cloneNode(true)
    this.editableKeys=[]
    this.tr.querySelectorAll("[editable]").forEach(each=>this.editableKeys.push(each.getAttribute("data")))
    this.mode=0
    this.page=0
    this.perpage = 8
    this.searching = false
    this.el[1].remove()
    this.json=[]
    this.oldJson=[]

    // events
    this.events = {}
    this.on = function(name,func){
        if(typeof this.events[name] == "undefined"){this.events[name]=[]}
        this.events[name].push(func)
    }
    this.runEvent=function(name,data){
        var events = this.events[name]
        if(typeof events != "undefined"){
            events.forEach(each=>{
                if(typeof each == "function"){each(data)}
            })            
        }

    }

    this.getJson = function(b){return this.searching?this.oldJson:this.json}
    this.setJson = function(js){
        if(this.searching){this.oldJson=js}
        else{this.json=js}
    }
    this.updateIds = function(){this.getJson().forEach((each,i)=>each.temp_id = i + 1)}
    this.newEntry = function(){
        var nE = this.getJson()[0],promise
        nE = JSON.stringify(nE)
        nE = JSON.parse(nE)
        this.editableKeys.forEach(each=>nE[each]="New Entry")
        this.page=0
        this.getJson().unshift(nE)
        this.updateIds()
        promise = this.loadALL()
        this.runEvent("add",nE)
        this.runEvent("data-change",this.getJson())
        return promise
    }

    this.delete = function(id){
        this.json = this.json.filter(each=>each.temp_id != id)
        this.oldJson = this.oldJson.filter(each=>each.temp_id != id)
        this.runEvent("delete",id)
        this.runEvent("data-change",this.getJson())
        this.render()
    }

    this.fillData = function(obj){
        var tr = this.tr.cloneNode(true)
        tr.querySelectorAll("[data]").forEach(dataEl=>{
            var key = dataEl.getAttribute("data")
            if(dataEl.tagName == "IMG"){dataEl.setAttribute("src",obj[key])}
            else if(dataEl.tagName == "INPUT"){dataEl.setAttribute("value",obj[key])}
            else{dataEl.innerHTML = obj[key] || ""}
            dataEl.setAttribute("spellchecker","false")
        })
        return tr
    }

    this.clearTable = function(){
        this.root.querySelector("tbody").innerHTML=""
    }

    this.render = function(){
        // rendering
        var obj = this,out = `<tr>${this.th.innerHTML}</tr>`
        if(this.json.length == 0){out += `<tr><td class="base_color" style="padding: 25px 0px;text-align:center;font-size:22px;" colspan="99">Empty</td></tr>`}
        this.json.forEach((each,i)=>{
            if(this.conditions(each,i)){
                var dtlBtn = obj.mode == 2 ? `<td class="btn"><svg class="deleteB" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></td>`:""
                htmlEL = this.fillData(each)
                out += `
                    <tr temp_id="${each.temp_id}">
                        ${htmlEL.innerHTML}
                        ${dtlBtn}
                    </tr>`
                console.log(dtlBtn)
            }
            
        })

        // edit-mode
        this.root.querySelector("tbody").innerHTML = out
        this.root.querySelectorAll("[editable]").forEach(each=>{
            each.setAttribute("contenteditable",this.mode == 1)
            if(this.mode == 1){
                var obj = this
                each.addEventListener("change",Aediting,false)
                each.addEventListener("keydown",Aediting,false)
                each.addEventListener("input",Aediting,false)
                function Aediting(ev){
                    obj.editing(ev,obj)
                }
            }
        })

        // trigger event
        this.runEvent("render",this)
    }

    this.totalPage = function(){return Math.ceil(this.json.length / (this.perpage))}
    this.conditions = function(each,i){
        // pagination
        var currentInd = this.perpage * this.page,
            pagination = i >= currentInd  && i < currentInd + this.perpage
        return pagination
    }

    this.editing = function(el,obj){
        if(typeof el.keyCode != "undefined" && el.keyCode == 13){
            el.preventDefault()
            el.target.blur()
            return false
        }
        var target = el.target,
            tr = target.closest("tr"),
            td = target.closest("td"),
            key = td.getAttribute("data"),
            iD = tr.getAttribute("temp_id"),
            selected =[]
        obj.getJson().filter(each=>{
            if(each.temp_id == iD){selected=each}
        })
        selected[key] = target.innerText
        obj.runEvent("edit",{data:selected,event:el})
        obj.runEvent("data-change",obj.getJson())
    }    

    this.loadALL = function(){
        var obj = this
        return new Promise(function(res,rej){
            obj.render()
            obj.pagiTextRender()            
            res(this)
        })
    }

    this.pagiTextRender = function(){
        var pEl = this.root.querySelector(".pagination"),
            text = pEl.querySelector(".title"),
            field = pEl.querySelector(".pageField")
        field.value = this.page + 1
        text.innerText = `Page (${(this.page + 1)}/${this.totalPage()})`
        this.runEvent("pagechange",this)
    }

    this.changePage = function(d){
        var el = this.root.querySelector(".pageField"),total = this.totalPage(),val=0,elVal = parseInt(el.value),isChanged=false
        if(d == "next"){val = elVal + 1}
        if(d == "prev"){val = elVal - 1}
        if(typeof d == "number"){val=d}
        if(val <= 0){val =1}
        if(val > total){val = total}
        if(this.page != val - 1){
            this.page = val - 1
            this.loadALL()
        }
    }

    this.searchArray = function searchArray(json,key){
        var searched = json.filter(each=>{
            return Object.values(each).join("").toLowerCase().indexOf(key.toLowerCase()) >= 0
        })
        return searched
    }

    this.addData = function(d){
        this.json = d
        this.updateIds()
        this.render()
    }

    this.appendData = function(d){
        this.json.push(d)
        this.render()
    }

    this.interactivity = function(){
        //searching system
        var search = this.root.querySelector(".searchField"),stimeout,obj=this
        if(search){
            search.oninput = onInput
            // search.onchange = onInput
            function onInput(i){
                clearTimeout(stimeout)
                stimeout=setTimeout(function(){
                    var val = i.target.value,r
                    if(val != ""){
                        obj.runEvent("search",{key:val,event:i})
                        obj.clearTable()
                        obj.page = 0
                        if(obj.searching == false){
                            obj.oldJson = obj.json
                            obj.runEvent("searchon",{key:val,event:i})
                        }
                        obj.json = obj.searchArray(obj.oldJson,val)
                        obj.searching = true
                        obj.loadALL()
                    }
                    else{
                        obj.json = obj.oldJson
                        obj.searching = false
                        obj.runEvent("searchoff",{key:val,event:i})
                        obj.loadALL()
                    }
                },600)
            }
        }
        // pagination
        var pagiField = obj.root.querySelector(".pageField")
        pagiField.onchange = function(e){
            if(e.target.value != ""){obj.changePage(parseInt(e.target.value))}
        }
        obj.pagiTextRender()

        // click handling
        var root = this.root
        root.onclick = e=>{
            var target = e.target,
                tr = target.closest("tr"),
                th = target.closest("th"),
                td = target.closest("td"),
                add = target.closest(".add"),
                edit = target.closest(".edit"),
                remove = target.closest(".remove"),
                deleteB = target.closest(".deleteB"),
                pageN = target.closest(".pageN"),
                pageP = target.closest(".pageP"),
                clearS = target.closest(".clearSearchBtn")

            if(clearS != null) {
                var el = obj.root.querySelector(".searchField")
                if(el.value != ""){
                    el.value=""
                    obj.searching=false
                    obj.json = obj.oldJson
                    obj.loadALL()
                }
            }

            if(add != null){
                obj.newEntry().then(function(){
                    obj.root.querySelector(".searchField").value=""
                    if(obj.searching){
                        obj.searching=false
                        obj.json = obj.oldJson
                    }
                    obj.loadALL()
                    if(obj.mode == 0){obj.root.querySelector(".edit").click()}
                })

            }
            if(edit != null){
                var isActive = edit.classList.contains("active")
                if(!isActive && obj.mode == 0){
                    obj.runEvent("editon",obj)
                    edit.classList.add("active")
                    obj.mode = 1
                    obj.root.classList.add("edit_mode")
                    obj.loadALL()
                    obj.root.querySelectorAll("[editable]")[0].focus()
                }
                else if(obj.mode == 1) {
                    obj.runEvent("editoff",obj)
                    edit.classList.remove("active")
                    obj.mode = 0
                    obj.loadALL()
                    obj.root.classList.remove("edit_mode")
                }
            }

            if(remove != null){
                var isActive=remove.classList.contains("active")
                if(!isActive && obj.mode == 0){
                    obj.runEvent("deleteon",obj)
                    remove.classList.add("active")
                    obj.mode = 2
                    obj.root.classList.add("delete_mode")
                    obj.loadALL()
                }
                else if(obj.mode == 2){
                    obj.runEvent("deleteoff",obj)
                    remove.classList.remove("active")
                    obj.mode = 0
                    obj.updateIds()
                    obj.loadALL()
                    obj.root.classList.remove("delete_mode")
                }
            }

            if(deleteB != null){
                var id = tr.getAttribute("temp_id")
                obj.delete(id)
            }

            if(pageN != null || pageP != null){
                var nP = 0
                nP = pageN != null ? "next" : "prev"
                obj.changePage(nP)
            }
            if(tr != null){
                var key = tr.getAttribute("temp_id")
                obj.runEvent("tr",{
                    el:tr,
                    data:obj.getJson().filter(each=>each.temp_id == key)[0],
                    target : target
                })
            }
        // click events end
        }
    }
}