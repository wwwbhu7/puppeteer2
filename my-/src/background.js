'use strict'

import { app, protocol, BrowserWindow } from 'electron'
const { ipcMain } = require('electron')
import {
  createProtocol,
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true } }])

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800, height: 600, webPreferences: {
      nodeIntegration: true
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('closed', () => {
    win = null
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installVueDevtools()
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }

  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

ipcMain.on('inputdata', (event, arg) => {
  let rawdata = arg;
  console.log(rawdata) 
  var mysql = require('mysql');
  var Promise = require('promise');
  var puppeteer = require('puppeteer')
  start()//puppeteer 开始爬虫
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "bvbp2q2@",
    database: "testbook"
  })
  async function start() {
    console.log('start')
    //连接服务器
    await connectMysql().then(function (resolve) {
      console.log(resolve), (function (reject) {
        console.log(reject)
      })
    })
    //创建母表
    await createMotherTable().then(function (resolve) {
      console.log(resolve), (function (reject) {
        console.log(reject)
      })
    })
    //开始循环
    for (let x = 0; x < rawdata.length; x++) {
      let seq = x + 1
      console.log("number" + seq + ":")
      var PN = rawdata[x]
      console.log(PN)
      let starPN = rawdata[x] + '*'
      let tablePN = 't' + PN.replace('-', '').trim()
      console.log("PN is " + PN)
      console.log('starPN is ' + starPN)
      //estimate if the PN is effective in EDOC;
      let ReceiveDescription = await runDescription(starPN)//get description
      let PNDescriptionComb = []
      PNDescriptionComb.push(PN)
      PNDescriptionComb.push(ReceiveDescription)
      await writeDescription(PNDescriptionComb)//把PN and description 写入到一个表里面
      //这里需要判断这个part 是否来源于EDOC 的订单，这个地方还是需要更详细的分析。
      if (ReceiveDescription != 'notfounded') {
        console.log(ReceiveDescription)//display PNDescription received
        //get the PN receivinf date
        let receivingDate = await runDate(PN)//run function get PN receivingdate, and PO number, as well as rev
        console.log('the date received is shown as below:')
        console.log(receivingDate)
        receivingDate[0][3] = PN//把PN 赋值给接受的时间，然后传进去下一个函数里面
        let kitrow = await runkit(receivingDate)
        console.log('the Kit name received is shown as below:')
        console.log(kitrow)
        let display = []
        for (let k = 0; k < receivingDate.length; k++) {
          let onerow = []
          onerow.push(PN);
          onerow.push(ReceiveDescription);
          onerow.push(receivingDate[k][0])
          onerow.push(receivingDate[k][1])
          onerow.push(kitrow[k])
          display.push(onerow)
        }
        console.log('the final display is:')
        console.log(display)

        //获取数据结束之后需要开始写入数据并且对比数据
        await createPNTable(tablePN).then(function (resolve) {
          console.log(resolve)
        }), (function (reject) {
          console.log(reject)
        })

        //判断这一次的数据和上一次的是都有差距，如果有就显示出来
        let noEqualAlert = []
        await getSql(display).then(function (resolve) {
          if (resolve.length == 0) {
            return newPNsql(PN)
          }
          else {
            for (let i = 0; i < resolve.length; i++) {
              if (display[i][3].trim() != resolve[i][2].trim()) {
                noEqualAlert.push(i)
                console.log(display[i][3].trim())
                console.log(resolve[i][2].trim())
              }
            }
            console.log(noEqualAlert.length)
            if (noEqualAlert.length >= 1) {
              console.log('there are ' + noEqualAlert.length + ' rows changed')
              return nonequal(tablePN)

            }
            else {
              return equal(equal)
            }
          }
        }, function (reject) {
          console.log('SQL 数据获取失败')
        })
          .then(function (resolve) {
            console.log(resolve)
            if (resolve == 'database refreshed') {
              return writemysql(display)
            }

          })
          .then(function (resolve) {
            console.log(resolve)
          })
      }
    }
  }
  //------------------------------------------------------
  async function connectMysql() {
    var connectSql = new Promise(function (resolve, reject) {

      con.connect(function (err) {
        if (err) {
          console.log(err)
          reject(err)
        }
        else {
          resolve("Connected!")
        }
      })
    })
    return connectSql
  }
  //------------------------------------------------------
  async function createMotherTable() {
    //首先创建表
    let insertbomtable = 'CREATE table if not exists partBom(partNumber VARCHAR(20) NOT NULL,Descriptions VARCHAR(200),UNIQUE KEY (partNumber),PRIMARY KEY(partNumber))'
    let returnInfo = new Promise(function (resolve, reject) {
      con.query(insertbomtable, function (err, result) {
        if (err) {
          reject(err)
        } else {
          if (result.warningCount == 1) {//1 means the table is existed
            resolve("BOM already exist")
          }
        }
      })
    })
    return returnInfo
  }

  //-------------------------------------------------------------------------
  function equal() {
    let p = new Promise(function (resolve, reject) {
      resolve('database is equal to this request')
      reject('error')
    })
    return p
  }
  //-------------------------------------------------------------------------
  function newPNsql(PN) {
    let p = new Promise(function (resolve, reject) {
      console.log('this PN ' + PN + ' is a new log for Sql.')
      resolve('new')
      reject('reject on the step of NewPNSql')
    })
    return p
  }
  //-------------------------------------------------------------------------
  function nonequal(tablePN) {
    let p = new Promise(function (resolve, reject) {
      console.log("the change of receive date is happening on the PartNumber of " + tablePN)
      const TruncateTable = 'TRUNCATE TABLE ' + tablePN
      con.query(TruncateTable, function (err, result, fields) {
        if (err) {
          console.log(err)
        } else {
          resolve('database refreshed')
        }
      })
    })
    return p
  }
  //-------------------------------------------------------------------------
  //function to get description. 
  async function runDescription(pn) {
    var browser = await puppeteer.launch({
      devtools: true,
      headless: true,
      ignoreHTTPSErrors: true
    })
    var page = await browser.newPage()
    await page.goto('http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiReviewMain.asp?txtProduct=EDOC&Tab=4', { waitUntil: 'load', timeout: 0 })
    await page.evaluate((pn) => {
      const selectorId = '#txtNumber'
      document.querySelector(selectorId).value = pn
      const next = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(3) > table > tbody > tr:nth-child(2) > td:nth-child(2) > input[type=submit]'
      document.querySelector(next).click()
    }, pn)
    //the following is the next page
    await page.waitForNavigation()//wait for the response
    let PNDescription = await page.evaluate(() => {
      const PNDescriptionSelector = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(3) > div'
      let description = document.querySelector(PNDescriptionSelector).innerHTML
      if (description) {
        return description
      } else {
        return 'notfounded'
      }
    })
    await page.close()
    await browser.close()
    return PNDescription
  }
  //-------------------------------------------------------------------------
  //function to get date
  async function runDate(pn) {
    var browser = await puppeteer.launch({
      devtools: true,
      headless: true,
      ignoreHTTPSErrors: true
    })
    var page = await browser.newPage()
    await page.goto('http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiPartPmemoHistory.asp?txtProduct=EDOC&Reg=1&Tab=4&TypeFlag=Part', { waitUntil: 'load', timeout: 0 })
    await page.evaluate((pn) => {
      const selectorId = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(2) > input'
      document.querySelector(selectorId).value = pn
      const next = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(3) > input[type=image]:nth-child(1)'
      document.querySelector(next).click()
    }, pn)
    console.log('step of getDate: first page logged')
    //thefollowing is the date page
    await page.waitForNavigation()//wait for the response
    //get the rev 
    let rev = await page.evaluate(() => {
      const revSelector = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(n+1) > td:nth-child(3) > div > font > a'
      let resultREV = []//defin a materix to save those data.
      let x = document.querySelectorAll(revSelector);
      for (let i = 0; i < x.length; i++) {
        resultREV[i] = x[i].innerHTML.trim()
      }
      console.log("revResult:")
      console.log(resultREV)
      return resultREV
    })//finish get rev data
    console.log(rev)
    let date = await page.evaluate(() => {
      var datereceived = 'td:nth-child(9) font'
      //这两个其实一样，但是长的那个是origional 的
      //const datereceived='body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(n+2) > td:nth-child(9) > div > font'
      let result = []//defin a materix to save those data.
      //next is to save those data
      let x = document.querySelectorAll(datereceived);
      for (let i = 0; i < x.length; i++) {
        result[i] = x[i].innerHTML.trim()
      }
      //保存数据
      if (result) {
        return result
      } else {
        return 'notfounded'
      }
    })
    console.log('date requird')
    //由于现在的这个列表里面可能有很多的购买次数，但是这些无法直接显示出来，所以需要再运行一下这些数据来获取一个信息就是kit
    let text = await page.evaluate(() => {
      let url = [];
      //urlSelector=' tr:nth-child(n) > td:nth-child(12) a'
      let urlSelector = ' tr:nth-child(n+2) > td:nth-child(12) > div '
      let x = document.querySelectorAll(urlSelector)
      for (let i = 0; i < x.length; i++) {
        url[i] = x[i].innerText
        if (url[i]) {
          url[i] = url[i].replace('Kits for ', '').trim()
        }
      }
      return url
    })
    console.log("step of Kit:")
    console.log(text)
    let matrix = []
    for (let i = 0; i < date.length; i++) {
      let temp = []
      temp.push(rev[i])
      temp.push(date[i])
      temp.push(text[i])
      matrix.push(temp)
    }
    //console.log(matrix)
    await page.close()
    await browser.close()
    return matrix
  }
  //-------------------------------------------------------------------------
  async function runkit(receivingDate) {
    let eachKit = []
    for (let i = 0; i < receivingDate.length; i++) {
      if (receivingDate[i][1] != '') {
        var browser = await puppeteer.launch({
          devtools: true,
          headless: true,
          ignoreHTTPSErrors: true
        })
        const page = await browser.newPage()
        let urllink = 'http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiPartToKit.asp?Reg=1&Tab=4&txtPN=' + receivingDate[0][3] + '&txtPONo=' + receivingDate[i][2]
        await page.goto(urllink, { waitUntil: 'load', timeout: 0 })
        let tempKit = await page.evaluate(() => {
          let kitSelector = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(n+4) > td:nth-child(1) > div > font > a'
          let kit = ''
          let x = document.querySelectorAll(kitSelector)
          console.log(x.length)
          for (let j = 0; j < x.length; j++) {
            kit = x[j].textContent + ';' + kit
          }
          console.log(kit)
          return kit
        })
        eachKit[i] = tempKit
        await page.close()
        await browser.close()
      } else {
        eachKit[i] = ''
      }
    }
    //console.log(eachKit)
    return eachKit
  }
  //-------------------------------------------------------------------------
  async function writeDescription(PNDescriptionComb) {//把PN and description 写入到一个表里面
    const insertdescription = 'REPLACE INTO partbom VALUES (' + "'" + PNDescriptionComb[0] + "'" + ',' + "'" + PNDescriptionComb[1] + "'" + ')'
    await con.query(insertdescription, function (err, result) {
      if (err) {
        console.log(err)
      }
      else {
        console.log(PN + ' Description inserted into sql')
      }
    })
  }
  //--------------------------------------------------------------------------------------
  //给每一个PN 创建一个Table 如果这个Table 不存在
  function createPNTable(tablePN) {
    //console.log(alldata)
    //开始写入mysql
    //create the PN table
    let P = new Promise(function (resolve, reject) {
      const insertPNtable = 'CREATE table if not exists ' + tablePN + '(PID int(10) primary key not null auto_increment,REV VARCHAR(20),DATERECEIVED VARCHAR(20),KIT4PO VARCHAR(2000) )'
      con.query(insertPNtable, function (err, result, fields) {
        if (err) {
          reject(err)
        }
        else {
          console.log(result.warningCount)
          if (result.warningCount == 2) {
            resolve('BOM already exist')
          }
          else {
            resolve(console.log('create Table of ' + tablePN + ' Successful'))
          }
        }
      })
    })
    return P
  }
  //--------------------------------------------------------------------------------------
  function getSql(display) {
    let P = new Promise(function (resolve, reject) {
      let tablePN = 't' + display[0][0].replace('-', '').trim()
      var selectall = 'select * from  ' + tablePN
      let dataArray = []
      con.query(selectall, function (err, result, fields) {
        if (!err) {
          for (let i = 0; i < result.length; i++) {
            let rachrow = Object.values(result[i])
            dataArray.push(rachrow)
          }
          //console.log(dataArray)
          resolve(dataArray)
          console.log('this is dataArray')
          console.log(dataArray)
        }
        else {
          reject(err)
        }
      })
    })
    return P
  }

  //--------------------------------------------------------------------------------------
  function writemysql(display) {
    let P = new Promise(function (resolve, reject) {
      let tablePN = 't' + display[0][0].replace('-', '').trim()
      //写入数据，覆盖原表格
      for (let i = 0; i < display.length; i++) {
        let j = i + 1
        const insertDetails = "replace into " + tablePN + "(pid,rev,DATERECEIVED,KIT4PO) values('" + j + "','" + display[i][2] + "','" + display[i][3] + "','" + display[i][4] + "')"
        con.query(insertDetails, function (err, result) {
          if (!err) {
            resolve(display[0][0] + ': insert/replace successful')
          }
          else {
            reject(err)
          }
        })
      }
    })
    return P
  }
})
