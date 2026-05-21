export const GlobVar: any = {
    debug: false,
    platformData: {},
    scaleRatio: 1,
    gameData: {},
    fontPadding:{
        "noto-tamil":[0,0.35,0,0.35]
    },
    getradius:(fw:number,fh:number,cratio:number = 0.15)=>{
        let radius = Math.sqrt(Math.pow(fw,2)+Math.pow(fh,2)) / 2;
        let corner = Math.floor(radius * cratio);
        return [radius, corner];
    },
    setfontpading:function(type:string,txt:any,fsize:number){
        const padding = this.fontPadding[type];
        if(padding){
            txt.setPadding(fsize * padding[0], fsize * padding[1], fsize * padding[2], fsize * padding[3]);
        }
    },
    shufflearray:function<T>(array: T[]): T[] {
        const arr = array.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    arraysequal:function(arr1:any, arr2:any){
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    },
    fileextension:(str:any)=>{
        if(str && str != ""){
            let n = str.lastIndexOf(".");
            return (n > -1 ? str.substr(0, n) : str);
        }else{
            return "";
        }
    },
    consolelog:(msg:string)=>{
        if(GlobVar.debug)
            console.log(msg);
    },
    getimageratio:()=>{
        if(GlobVar.isDesktop === true){ //Desktop
            return 0.75;
        }else if(window.game!.device.os.iPad || GlobVar.istablet()){ //Tablet
            return 0.72;
        }
        return 1;
    },
    istablet:()=>{
        const userAgent = navigator.userAgent.toLowerCase();
        const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
        return isTablet;
    },
}