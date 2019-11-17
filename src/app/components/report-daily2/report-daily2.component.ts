import { Component, OnInit } from '@angular/core';
import { GlobalService, RequestData } from 'src/app/services/global.service';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { Observable } from 'rxjs';
import { LoadingController, AlertController } from '@ionic/angular';


@Component({
  selector: 'app-report-daily2',
  templateUrl: './report-daily2.component.html',
  styleUrls: ['./report-daily2.component.scss'],
})
export class ReportDaily2Component implements OnInit {

  requestDatas = [];
  txtTimeArrived: string;
  txtTimeReturn: string;
  photo: any = [];

  constructor(
    private globalService: GlobalService,
    private http: HttpClient,
    private storage: Storage,
    private loadingController: LoadingController,
    private alertController: AlertController) {
    this.GetLoopRequestDatas();
    this.PresentLoading();
  }

  ngOnInit() { }

  GetLoopRequestDatas() {
    setInterval(function () {
      this.GetRequestDatas();
    }.bind(this), 500);
  }

  async GetRequestDatas() {
    this.requestDatas = this.globalService.requestDatas;
    if (this.requestDatas.length > 0)
      this.loadingController.dismiss();
  }

  async PresentLoading() {
    const loading = await this.loadingController.create({
      mode: 'ios'
    });
    await loading.present();
  }

  public IsAnyIncident(namaPekerja: string) {
    this.alertController.create({
      mode: 'ios',
      message: 'Apakah ' + namaPekerja + ' mengalami insiden hari ini?',
      buttons: [{
        text: 'NO'
      }, {
        text: 'YES',
        handler: () => {
          this.globalService.jumlahInsiden += 1;
        }
      }]
    }).then(alert => {
      return alert.present();
    });
  }
}
