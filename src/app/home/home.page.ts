import { Router, NavigationExtras } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { Geolocation, GeolocationOptions, Geoposition, PositionError } from '@ionic-native/geolocation/ngx';
import { Component } from '@angular/core';
import { PopoverController, AlertController, NavController, Platform, IonRouterOutlet, LoadingController, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs/Observable';
import { GlobalService, ActivityId, DateData, ReportData, PekerjaData } from '../services/global.service';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { File } from '@ionic-native/file/ngx';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage {
  public txtDayNow: string;
  public txtTimeNow: string;
  public txtTimeArrived: string;
  public txtTimeReturn: string = "";
  public txtWorkStatus: string = "";
  public colorStatus: string;
  public photos: any = [];
  public jumlahInsiden: number = 0;
  private image: any;

  public response: any;
  public unknowPersonsNumber: number;

  private deletedInt: number = 1;

  constructor(public navCtrl: NavController, public alertController: AlertController,
    public router: Router,
    public geolocation: Geolocation,
    public http: HttpClient,
    public popoverController: PopoverController,
    private globalService: GlobalService,
    private platform: Platform,
    private statusBar: StatusBar,
    private camera: Camera,
    private file: File,
    private transfer: FileTransfer,
    public loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.InitializeApp();
    this.InitializeData();
    this.Timer();
  }

  private fileTransfer: FileTransferObject = this.transfer.create();

  InitializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleBlackTranslucent();
    });
  }

  async InitializeData() {
    await this.globalService.GetUserDataFromStorage();
  }

  private Timer() {
    setInterval(function () {
      this.ShowRepeatData();
    }.bind(this), 500);
  }

  ShowRepeatData() {
    var dateData = this.globalService.GetDate();

    this.txtDayNow = dateData.szDay + ", " + dateData.decDate + " " + dateData.szMonth + " " + dateData.decYear;
    this.txtTimeNow = this.CheckTime(dateData.decHour) + ":" + this.CheckTime(dateData.decMinute) + ":" + this.CheckTime(dateData.decSec) + " " + dateData.szAMPM;
    this.jumlahInsiden = this.globalService.jumlahInsiden;
  }

  private CheckTime(i: any) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
  }

  DoRefresh(event: any) {
    this.InitializeData();

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  async ButtonAbsen() {
    try {
      this.GetUserPosition();
      this.ValidateAbsen();
    }
    catch (e) {
      this.alertController.create({
        mode: 'ios',
        message: e.message,
        buttons: ['OK']
      }).then(alert => {
        return alert.present();
      });
    }
  }

  private GetUserPosition() {
    var options: GeolocationOptions = {
      enableHighAccuracy: true
    };
    this.geolocation.getCurrentPosition(options).then((pos: Geoposition) => {
      this.globalService.geoLatitude = pos.coords.latitude;
      this.globalService.geoLongitude = pos.coords.longitude;
      console.log(pos.coords);

    }, (err: PositionError) => {
      console.log("error : " + err.message);
    });
  }

  ValidateAbsen() {
    if (this.globalService.geoLatitude >= -6.305325 && this.globalService.geoLatitude <= -6.302507 && this.globalService.geoLongitude >= 106.853389 && this.globalService.geoLongitude <= 106.859000) {
      // this.GetDataPekerja("PPB1.001.001");
      this.TakePhotos();
    }
    else {
      throw new Error("Diluar lokasi proyek");
    }
  }

  ChooseImage() {
    const options: CameraOptions = {
      quality: 100,
      sourceType: this.camera.PictureSourceType.PHOTOLIBRARY,
      destinationType: this.camera.DestinationType.FILE_URI,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE
    }
    this.camera.getPicture(options).then((imageData) => {
      // imageData is either a base64 encoded string or a file URI
      // If it's base64 (DATA_URL):
      // let base64Image = 'data:image/jpeg;base64,' + imageData;
    }, (err) => {
      // Handle error
    });
  }

  private TakePhotos() {
    this.photos = [];
    const options: CameraOptions = {
      quality: 100,
      mediaType: this.camera.MediaType.PICTURE,
      destinationType: this.camera.DestinationType.FILE_URI,
      sourceType: this.camera.PictureSourceType.CAMERA,
      encodingType: this.camera.EncodingType.JPEG,
      targetWidth: 500,
      targetHeight: 500,
      allowEdit: true,
      saveToPhotoAlbum: true
    }

    this.camera.getPicture(options).then((imageData) => {
      this.image = imageData.split("?", 1)[0];
      this.GetPerson();

      let filename = imageData.substring(imageData.lastIndexOf('/') + 1);
      let path = imageData.substring(0, imageData.lastIndexOf('/') + 1);
      this.file.readAsDataURL(path, filename).then((base64Data) => {
        this.photos.push(base64Data);
      })
    }, (err) => {
      this.PresentAlert("Gagal ambil gambar");
    });
  }

  private GetPerson() {
    this.PresentLoading();
    var url: string = "https://face-recognition-lica.herokuapp.com/upload_image";

    this.unknowPersonsNumber = 0;
    this.response = [];

    let options: FileUploadOptions = {
      fileKey: 'file'
    }

    this.fileTransfer.upload(this.image, url, options)
      .then(res => {

        this.response = JSON.parse(res.response);
        this.response = this.response[0].response;

        if (typeof this.response == 'string') {
          if (this.response.includes("An error")) {
            alert(this.response);
          } else {
            this.response = [this.response];
            this.loadingController.dismiss();
            this.GetDataPekerja(this.response[0]);
          }
        }

        this.response.forEach(val => {
          if (val == 'Unknow person') {
            this.unknowPersonsNumber += 1;
          }
        });

        this.response = this.response.filter(value => {
          return value != 'Unknow person'
        });

        let lengthBefore = this.response.length;

        this.response = this.response.filter((value, index, array) => {
          return array.indexOf(value) == index;
        });

        this.unknowPersonsNumber += lengthBefore - this.response.length;

      }, err => {
        this.loadingController.dismiss();
        this.PresentAlert("Gagal lakukan face recognition");
      })
  }

  async PresentLoading() {
    const loading = await this.loadingController.create({
      mode: 'ios'
    });
    await loading.present();
  }

  private GetDataPekerja(szidpekerja: string) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/apron/getdatakaryawan.php';

    let postdata = new FormData();
    postdata.append('szidpekerja', szidpekerja);

    var data: any = this.http.post(url, postdata);
    data.subscribe(data => {
      if (data.error == false) {
        var pekerjaDataFromDb = data.result.find(x => x);

        var pekerjaData = this.MappingPekerjaData(pekerjaDataFromDb);
        this.ReturnAlertInfoPekerja(pekerjaData);
      }
      else {
        alert("GAGAL DI GET DATA KARYAWAN");
      }
    });
  }

  private MappingPekerjaData(pekerjaDataFromDb: any) {
    var pekerjaData = new PekerjaData();
    pekerjaData.szidmandor = pekerjaDataFromDb.szidmandor;
    pekerjaData.sznamamandor = pekerjaDataFromDb.sznamamandor;
    pekerjaData.sznamaproyek = pekerjaDataFromDb.sznamaproyek;
    pekerjaData.szidpekerja = pekerjaDataFromDb.szidpekerja;
    pekerjaData.sznamapekerja = pekerjaDataFromDb.sznamapekerja;
    return pekerjaData;
  }

  private ReturnAlertInfoPekerja(pekerjaData: PekerjaData) {
    this.alertController.create({
      mode: 'ios',
      message: 'Apakah benar anda?',
      inputs: [
        {
          value: 'Nama Pekerja : ' + pekerjaData.sznamapekerja,
          disabled: true
        }, {
          value: 'Nama Mandor : ' + pekerjaData.sznamamandor,
          disabled: true
        }, {
          value: 'Nama Proyek : ' + pekerjaData.sznamaproyek,
          disabled: true
        },
      ],
      // message: 'Nama Pekerja: ' + pekerjaData.sznamapekerja + '</br> Nama mandor: ' + pekerjaData.sznamamandor + '</br> Nama Proyek: ' + pekerjaData.sznamaproyek,
      buttons: [{
        text: 'RETRY',
        handler: () => {
          this.TakePhotos();
        }
      }, {
        text: 'NEXT',
        handler: () => {
          this.ReturnAlertIsiKodeAPD(pekerjaData.sznamapekerja);
        }
      }]
    }).then(alert => {
      return alert.present();
    });
  }

  private ReturnAlertIsiKodeAPD(sznamapekerja: string) {
    this.alertController.create({
      mode: 'ios',
      message: 'Masukkan kode APD',
      inputs: [
        {
          placeholder: 'Kode APD'
        }
      ],
      buttons: [{
        text: 'CANCEL',
        role: 'cancel'
      }, {
        text: 'NEXT',
        handler: () => {
          this.PresentToast("Berhasil melakukan absen: '" + sznamapekerja + "'");
        }
      }]
    }).then(alert => {
      return alert.present();
    });
  }

  private PresentAlert(msg: string) {
    this.alertController.create({
      mode: 'ios',
      message: msg,
      buttons: ['OK']
    }).then(alert => {
      return alert.present();
    });
  }

  async PresentToast(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      mode: "ios",
      position: "top"
    });
    toast.present();
  }

  public NavigateToReportPage(indexReport: string) {
    let navigationExtras: NavigationExtras = {
      state: {
        indexReport: indexReport
      }
    };
    this.router.navigate(['reports'], navigationExtras);
  }
}

