import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { GlobalService, PekerjaData } from '../services/global.service';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { File } from '@ionic-native/file/ngx';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer/ngx';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit {

  pages = [
    {
      index: 1,
      title: 'Tambah Pekerja',
      icon: 'person-add'
    },
    {
      index: 2,
      title: 'Lihat Pekerja',
      icon: 'bookmark'
    },
    {
      index: 3,
      title: 'Report',
      icon: 'today'
    },
    {
      index: 4,
      title: 'Logout',
      icon: 'power'
    }
  ];

  selectedPath: number;
  public txtjumlah: string;
  public txtnamamandor: string;
  public txtperusahaan: string;
  public txtnamaproyek: string;
  public photos: any = [];

  constructor(private router: Router,
    private authService: AuthenticationService,
    private globalService: GlobalService,
    private camera: Camera,
    private alertController: AlertController,
    private toastController: ToastController,
    public loadingController: LoadingController,
    private file: File,
    private transfer: FileTransfer) {
    this.Timer();
  }

  private fileTransfer: FileTransferObject = this.transfer.create();

  private Timer() {
    setInterval(function () {
      this.ShowFirstLoadData();
    }.bind(this), 500);
  }

  private ShowFirstLoadData() {
    this.txtnamamandor = this.globalService.userData.sznamamandor;
    this.txtperusahaan = this.globalService.userData.szperusahaan;
    this.txtnamaproyek = this.globalService.userData.sznamaproyek;
    this.txtjumlah = this.globalService.userData.szjumlah;
  }

  ngOnInit() {
  }

  NavRouterMenu(index: number) {
    this.selectedPath = index;
    if (index == 1) {
      this.AddDummyImage();
      // this.MappingAndSaveDataPekerja("tes ehe");
    }
    if (index == 2) {
      this.router.navigate(['notifications']);
    }
    else if (index == 3) {
      let navigationExtras: NavigationExtras = {
        state: {
          indexReport: 1
        }
      };
      this.router.navigate(['reports'], navigationExtras);
    }
    else if (index == 4) {
      this.authService.logout();
    }
  }

  public AddDummyImage() {
    const options: CameraOptions = {
      quality: 100,
      mediaType: this.camera.MediaType.PICTURE,
      destinationType: this.camera.DestinationType.FILE_URI,
      sourceType: this.camera.PictureSourceType.CAMERA,
      encodingType: this.camera.EncodingType.JPEG,
      targetWidth: 500,
      targetHeight: 500,
      allowEdit: true,
      saveToPhotoAlbum: false
    }

    this.camera.getPicture(options).then((imageData) => {
      this.MappingAndSaveDataPekerja(imageData);


    }, (err) => {
      this.PresentAlert("Gagal ambil gambar");
    });
  }

  private MappingAndSaveDataPekerja(imageData: any) {
    var pekerjaData = new PekerjaData();
    pekerjaData.szimage = imageData;
    pekerjaData.szidmandor = this.globalService.userData.szidmandor;
    this.PresentFillDataPekerja(pekerjaData);
  }

  PresentFillDataPekerja(pekerjaData: PekerjaData) {
    this.alertController.create({
      mode: 'ios',
      message: 'Masukkan Data Pekerja',
      inputs: [
        {
          name: 'szidpekerja',
          placeholder: 'Id Pekerja'
        }, {
          name: 'sznamapekerja',
          placeholder: 'Nama Pekerja'
        }
      ],
      buttons: [{
        text: 'CANCEL',
        role: 'cancel'
      }, {
        text: 'NEXT',
        handler: data => {
          pekerjaData.szidpekerja = data.szidpekerja;
          pekerjaData.sznamapekerja = data.sznamapekerja;
          this.globalService.SavePekerja(pekerjaData);
          this.AddImageToFaceRecognition(pekerjaData);
        }
      }]
    }).then(alert => {
      return alert.present();
    });
  }

  private AddImageToFaceRecognition(pekerjaData: PekerjaData) {
    this.PresentLoading();
    var image = pekerjaData.szimage.split("?", 1)[0];
    var url: string = "https://face-recognition-lica.herokuapp.com/add_image";

    let options: FileUploadOptions = {
      fileKey: 'file'
    }

    if (pekerjaData.szimage.length != 0)
      options.fileName = pekerjaData.szidpekerja + '.jpeg';

    this.fileTransfer.upload(image, url, options)
      .then(res => {
        this.loadingController.dismiss();
      }, err => {
        this.loadingController.dismiss();
        this.PresentAlert("Gagal menyimpan ke server face recognition");
      })
    // let filename = pekerjaData.szimage.substring(pekerjaData.szimage.lastIndexOf('/') + 1);
    // let path = pekerjaData.szimage.substring(0, pekerjaData.szimage.lastIndexOf('/') + 1);
    // this.file.readAsDataURL(path, filename).then((base64Data) => {
    //   this.photos.push(base64Data);
    // })
  }

  private AddPerson() {

  }

  async PresentLoading() {
    const loading = await this.loadingController.create({
      mode: 'ios'
    });
    await loading.present();
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

  private PresentAlert(msg: string) {
    this.alertController.create({
      mode: 'ios',
      message: msg,
      buttons: ['OK']
    }).then(alert => {
      return alert.present();
    });
  }
}
