<template>
<div id="app">
<el-container>
     <el-header font-size:30px>
        <el-row height="60px">
          <el-col :span="2">
              <el-image style="width: 170px; height: 60px"
                :src= "url"
                :fit="fit"></el-image>  
    </el-col>
  <el-col :span="20"><span>EDOC Assistant</span></el-col>
    <el-col :span="2"><div class="grid-content bg-purple"></div></el-col>
    </el-row>
    </el-header>
<el-main>
    <el-menu :default-active="activeIndex" class="el-menu-demo" mode="horizontal" @select="handleSelect">
    <el-menu-item index="1">Tracking</el-menu-item>
    <el-menu-item index="2" disabled>ToBeContinued</el-menu-item>
    </el-menu>
    <el-row class="search-margin">
      <el-button type="primary" icon="el-icon-search"  v-on:click="searchbutton"> Search</el-button>
      <el-button type="success">Excel Import</el-button>
    </el-row>
    <div>
      <el-input  v-model="inputText" type="textarea" :rows="3"     placeholder="please type in full PNs divided by space"></el-input>
    </div>
  <p>{{ inputText }}</p>
    <el-table      :data="tableData"      style="width: 100%" class="table-margin">
      <el-table-column
        prop="PN"
        label="PartNumber"
        width="180">
      </el-table-column>
      <el-table-column
        prop="Rev"
        label="REV"
        width="100">
      </el-table-column>
      <el-table-column
        prop="Description"
        label="Description"
        width="360">
      </el-table-column>
        <el-table-column
        prop="Date"
        label="Date"
        width="180">
      </el-table-column>
        <el-table-column
        prop="KitName"
        label="KitName"
        width="180">
      </el-table-column>
      </el-table>
      </el-main>
    </el-container>
</div>


</template>

<style>
.head-grid{
    grid-template-columns: auto auto;
}
.bg-purple-light {
    background: #e5e9f2;
  }
 .el-row {
    margin-bottom: 20px;
  }
  .el-col {
    border-radius: 4px;
  }
  .grid-content {
    border-radius: 4px;
    min-height: 36px;
  }
  .row-bg {
    padding: 10px 0;
    background-color: #f9fafc;
  }
 .el-header{
    background-color: #f9fafc;
    color: #333;
    text-align: center;
    line-height: 100px;
  } 
  .el-table .warning-row {
    background: oldlace;
  }

  .el-table .success-row {
    background: #ebf9f1;
  }
  .search-margin{
    margin-top:20px;
    margin-bottom: 20px;
  }
  .table-margin{
    margin-top:20px;

  } 
                                                                  
</style>

 <script>
    export default {
      data() {
            return {
          tableData: [{
            PN: '0775562-000',
            Rev: 'AA',
            Description: 'shielding,stage,x2',
            Date: '2019/03/02',
            KitName:'ENG'
          }, {
           PN: '0775562-000',
            Rev: 'AA',
            Description: 'shielding,stage,x2',
            Date: '2019/03/02',
            KitName:'beta1'
          }, {
           PN: '0775562-000',
            Rev: 'AA',
            Description: 'shielding,stage,x2',
            Date: '2019/03/02',
            KitName:'beta2'
          }, {
           PN: '0775562-000',
            Rev: 'AA',
            Description: 'shielding,stage,x2',
            Date: '2019/03/02',
            KitName:'kti1 '
          }],
          fit: ['scale-down'],
          url: require('./assets/kla-logo.png'),
          inputText: ''     
        }
      },
      methods: {
          searchbutton() {
            var rowData=this.inputText.split('\n')
            let  rawdata = [];
            for(let i=0;i<rowData.length;i++){
              let eachRow=rowData[i].split(' ')
              for(let j=0;j<eachRow.length;j++){
                rawdata.push(eachRow[j])
              }
            }
            console.log(rawdata)
            console.log(rawdata.length)
            const {ipcRenderer} = require('electron')
            ipcRenderer.send('inputdata',rawdata)
            console.log('2')
          }
      }
    }      
  </script>
