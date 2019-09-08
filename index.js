const express = require('express')
const app = express()
const port = 3000
const puppeteer = require('puppeteer');

const url = 'https://www.msn.com/he-il/';
const depth = 1;
async function ScrapPageContent(url,depth) {
  if (!url) {
    return null
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url).catch(err => console.log(err))

  const links =  await page.$$eval('a', links => {
    links = links.filter(a => {
      if(a.href) {
        const sameOrigin = new URL(location).origin === new URL(a.href).origin
        //const samePage = a.href === location.href
        //return !samePage && !sameOrigin
        return !sameOrigin
      }
    }).map(a=>a.href)
    return Array.from(new Set(links))
  }).catch(err => {
    console.log(err)
  })
  
  const retObj = await page.evaluate(() => {
     const divs = []
     var tempDivArr = document.getElementsByTagName('div')
     const scripts = []
     var tempScriptsArr = document.getElementsByTagName('script')
    if (tempDivArr && tempDivArr.length > 0) {
      for (var i=0; i<tempDivArr.length; i++) {
        const {top,left,bottom,right} = tempDivArr[i].getBoundingClientRect();
        divs.push({top:top,left:left,bottom:bottom,right:right,div:tempDivArr[i]})
      }
    }
    if (tempScriptsArr && tempScriptsArr.length > 0) {
      for (var i=0; i<tempScriptsArr.length; i++) {
        scripts.push(tempScriptsArr[i].innerText);
      }
    }
    return {
      title: document.title,
      divs: divs,
      scripts: scripts
    }
  }).catch(err=>console.log(err));

  await browser.close();
  if (links && links.length > 0 && depth > 0) {
    var promises = []
    var linksObj = []
    for (var i = 0; i< links.length; i++) {
        promises.push(ScrapPageContent(links[i],depth-1))
        var tempArr = []
        if ((i%20 === 0 && i != 0) ||i === links.length -1 && i%20 > 0) {
          tempArr = await Promise.all(promises).then(ret => {
            return ret
          }).catch(err => {
            console.log(err)
          })
          linksObj = linksObj.concat(tempArr)
          promises = []
        }
      }
    } else {
      linksObj = links
    }  
    return {
      url: url,
      links: linksObj,
      title: retObj? retObj.title : null, 
      divs: retObj? retObj.divs : null,
      scripts: retObj? retObj.scripts : null,
    }
  } 
  
app.get('/', async (req, res) => {
    //we will get the url and depth by req instead of static
  const obj = await ScrapPageContent(url,depth)
  res.status(200).send(obj)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

