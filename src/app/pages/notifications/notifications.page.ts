import { Component, OnInit, ViewChild } from '@angular/core';
import { Storage } from '@ionic/storage';
import { GlobalService, PekerjaData } from 'src/app/services/global.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit {

  public pekerjaDatas = [];
  requestDataStatus: string;

  constructor(private storage: Storage,
    private globalService: GlobalService, public http: HttpClient) { 
    }

  ngOnInit() {
    this.ShowFirstLoadData();
  }

  GetLoopRequestDatas() {
    setInterval(function () {
      this.GetRequestDatas();
    }.bind(this), 500);
  }
  
  async ShowFirstLoadData() {
    this.pekerjaDatas = [];
    var url = 'http://sihk.hutamakarya.com/apiabsen/apron/GetPekerja.php';

    let postdata = new FormData();

    var data: any = this.http.post(url, postdata);
    data.subscribe(data => {
      if (data.error == false) {
        data.result.forEach(data => {
          this.MappingPekerjaDatas(data);
        });
      }
      else {
        console.log(data.error_msg);
      }
    });
  }

  MappingPekerjaDatas(data: any) {
      var pekerjaData = new PekerjaData();
      pekerjaData.szidpekerja = data.szidpekerja;
      pekerjaData.sznamapekerja = data.sznamapekerja;
      pekerjaData.sznamaproyek = data.sznamaproyek;
      pekerjaData.szimage = 'data:image/jpeg;base64,' + data.szimage;
      this.pekerjaDatas.push(pekerjaData);
  }
}
