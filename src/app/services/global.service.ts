import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InjectorInstance } from '../app.module';
import { Observable } from 'rxjs';
import { ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';
import { Storage } from '@ionic/storage';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  public requestDatas = [];
  public summaryReportDatas = [];
  public timeArrived: string = "";
  public timeReturn: string = "";
  public timeRequest: string = "";
  public dateRequest: string = "";
  public isArrived: boolean = true;
  public userData: UserData = new UserData();
  public geoLatitude: number;
  public geoLongitude: number;
  public jumlahInsiden: number = 0;

  httpClient = InjectorInstance.get<HttpClient>(HttpClient);
  dataimage: any;
  requestDataStatus: string = "";

  constructor(private router: Router,
    private toastController: ToastController,
    private authService: AuthenticationService,
    private alertController: AlertController,
    private storage: Storage) { }

  public GetDate(): DateData {
    var dateData = new DateData();
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    var date = new Date();

    dateData.date = date;
    dateData.decYear = date.getFullYear();
    dateData.szMonth = months[date.getMonth()];
    dateData.decMonth = date.getMonth() + 1;
    dateData.decDate = date.getDate();
    dateData.szDay = days[date.getDay()];
    dateData.decMinute = date.getMinutes();
    dateData.szMinute = dateData.decMinute < 10 ? "0" + dateData.decMinute : dateData.decMinute.toString();
    dateData.decHour = date.getHours();
    dateData.szHour = dateData.decHour < 10 ? "0" + dateData.decHour : dateData.decHour.toString();
    dateData.decSec = date.getSeconds();
    dateData.szAMPM = dateData.decHour > 12 ? "PM" : "AM";

    return dateData;
  }

  public async GetUserDataFromStorage() {
    await this.storage.get('userData').then((userData) => {
      this.userData = userData;
    });
  }

  public GetUserData(szUserId: string, szPassword: string) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/apron/login.php';

    let postdata = new FormData();
    postdata.append('szidmandor', szUserId);
    postdata.append('password', szPassword);

    var data: any = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      if (data.error == false) {
        var userDataFromDb = data.result.find(x => x);
        console.log(userDataFromDb);

        var userData = this.MappingUserData(userDataFromDb);

        this.storage.set('userData', userData);
        this.PresentToast("Login Berhasil");
        this.authService.login();
        this.router.navigate(['home']);
      }
      else {
        this.PresentToast("Login Gagal");
      }
    });
  }

  private MappingUserData(userDataFromDb: any) {
    var userData = new UserData();
    userData.szidmandor = userDataFromDb.szidmandor;
    userData.password = userDataFromDb.password;
    userData.sznamamandor = userDataFromDb.sznamamandor;
    userData.szperusahaan = userDataFromDb.szperusahaan;
    userData.sznamaproyek = userDataFromDb.sznamaproyek;
    userData.szalamat = userDataFromDb.szalamat;
    userData.szjumlah = userDataFromDb.szjumlah;
    return userData;
  }

  public SaveImage(imageData: any) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/apron/SaveImage.php';
    let postdata = new FormData();
    postdata.append('image', imageData);

    var data: Observable<any> = this.httpClient.post(url, postdata);
    data.subscribe(data => { });
  }

  SavePekerja(pekerjaData: PekerjaData) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/apron/SavePekerja.php';
    let postdata = new FormData();
    postdata.append('szidpekerja', pekerjaData.szidpekerja);
    postdata.append('sznamapekerja', pekerjaData.sznamapekerja);
    postdata.append('szidmandor', pekerjaData.szidmandor);
    postdata.append('szimage', pekerjaData.szimage);

    var data: Observable<any> = this.httpClient.post(url, postdata);
    data.subscribe(data => { });
    this.PresentToast("Berhasil menambahkan pekerja baru");
  }

  public SaveReportData(reportData: ReportData) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/SaveReportData.php';
    let postdata = new FormData();
    postdata.append('szUserId', reportData.szUserId);
    postdata.append('dateAbsen', reportData.dateAbsen);
    postdata.append('timeArrived', reportData.timeArrived);
    postdata.append('timeValidArrived', reportData.timeArrived);
    postdata.append('timeReturn', reportData.timeReturn);
    postdata.append('timeValidReturn', reportData.timeReturn);

    var data: Observable<any> = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      if (data.error == true) {
        this.PresentAlert(data.error_msg);
        throw new Error(data.error_msg);
      }
    });
  }

  public GetReportData(szUserId: string, dateAbsen: string) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/GetReportDatas.php';

    let postdata = new FormData();
    postdata.append('szUserId', szUserId);
    postdata.append('dateStart', dateAbsen);
    postdata.append('dateEnd', dateAbsen);

    var data: any = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      if (data.error == false) {
        var reportDataFromDb = data.result.find(x => x);
        var reportData = this.MappingReportData(reportDataFromDb);

        var timeValidArrived = reportData.timeValidArrived.split(':');
        var { hour, minute, ampm } = this.ConvertTimeToViewFormat(timeValidArrived);
        this.timeArrived = hour + ":" + minute + " " + ampm;

        var timeValidBack = reportData.timeValidReturn.split(':');
        var { hour, minute, ampm } = this.ConvertTimeToViewFormat(timeValidBack);
        this.timeReturn = hour == 0 && minute == 0 ? "" : hour + ":" + minute + " " + ampm;
      }
      else {
        this.timeArrived = "";
        this.timeReturn = "";
      }
    });
  }

  private MappingReportData(reportDataFromDb: any) {
    var reportData = new ReportData();
    reportData.szUserId = reportDataFromDb.szuserid;
    reportData.dateAbsen = reportDataFromDb.dateabsen;
    reportData.timeArrived = reportDataFromDb.timearrived;
    reportData.timeValidArrived = reportDataFromDb.timevalidarrived;
    reportData.timeReturn = reportDataFromDb.timereturn;
    reportData.timeValidReturn = reportDataFromDb.timevalidreturn;
    reportData.decMonth = reportDataFromDb.decmonth;

    return reportData;
  }

  private ConvertTimeToViewFormat(timeFromDb: any) {
    var hour = timeFromDb[0]; // < 10 && timeFromDb[0] != 0 ? "0" + timeFromDb[0] : timeFromDb[0];
    var minute = timeFromDb[1]; // < 10 && timeFromDb[1] != 0 ? "0" + timeFromDb[1] : timeFromDb[1];
    var ampm = timeFromDb[2] > 12 ? "PM" : "AM";
    return { hour, minute, ampm };
  }

  public GetSummaryReportData(currentYear: string) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/GetReportDatas.php';
    var months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    let postdata = new FormData();
    postdata.append('szUserId', this.userData.szidmandor);
    postdata.append('dateStart', '01/01/' + currentYear);
    postdata.append('dateEnd', '12/31/' + currentYear);

    var data: any = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      if (data.error == false) {
        var reportDatas = data.result;
        var decMonths = [...new Set(reportDatas.map(x => x.decmonth))];

        decMonths.forEach((x: number) => {
          var reportDatasPerMonth = reportDatas.filter(y => y.decmonth == x);

          var summaryReportData = new SummaryReportData();
          summaryReportData.szMonthAttendance = months[x - 1];
          summaryReportData.decTotalAttendance = [...new Set(reportDatasPerMonth.map(y => y.dateabsen))].length;
          summaryReportData.decTotalAbsen = 22 - summaryReportData.decTotalAttendance; // call fungsi bulan ini ada berapa hari
          summaryReportData.decTotalLate = reportDatasPerMonth.filter(y => y.szstatusid == "ST001" && y.szactivityid == "AC002").reduce((sum, current) => sum + +current.dectotal, 0);
          summaryReportData.decTotalBackEarly = reportDatasPerMonth.filter(y => y.szstatusid == "ST001" && y.szactivityid == "AC005").reduce((sum, current) => sum + +current.dectotal, 0);
          summaryReportData.decTotalOvertime = reportDatasPerMonth.filter(y => y.szstatusid == "ST001" && y.szactivityid == "AC006").reduce((sum, current) => sum + +current.dectotal, 0);
          this.summaryReportDatas.push(summaryReportData)
        });
      }
      else {
        console.log("Tidak ada yang dapat ditampilkan");
      }
    });
  }

  public GetRequestDatasByUserId(szUserId: string, dateRequest: string) {
    this.requestDatas = [];
    var url = 'http://sihk.hutamakarya.com/apiabsen/apron/GetImage.php';

    let postdata = new FormData();

    var data: any = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      if (data.error == false) {
        var index = 0;
        data.result.forEach(img => {
          index = this.MappingReqDatas(index, img);
        });
      }
      else {
        console.log("Tidak ada yang dapat ditampilkan");
      }
    });
  }

  private MappingReqDatas(index: number, img: any) {
    index += 1;
    if (index == 1) {
      var requestData = new RequestData();
      requestData.namaPekerja = "Susanto Akbar Hadi";
      requestData.szStatusId = StatusId.ST002;
      requestData.szReasonImage = 'data:image/jpeg;base64,' + img.image;
      requestData.statusInsiden = false;
      this.requestDatas.push(requestData);
    }
    if (index == 2) {
      var requestData = new RequestData();
      requestData.namaPekerja = "M. Mahmud";
      requestData.szStatusId = StatusId.ST001;
      requestData.szReasonImage = 'data:image/jpeg;base64,' + img.image;
      requestData.statusInsiden = false;
      this.requestDatas.push(requestData);
    }
    if (index == 3) {
      var requestData = new RequestData();
      requestData.namaPekerja = "Pariyaman";
      requestData.szStatusId = StatusId.ST002;
      requestData.szReasonImage = 'data:image/jpeg;base64,' + img.image;
      requestData.statusInsiden = false;
      this.requestDatas.push(requestData);
    }
    if (index == 4) {
      var requestData = new RequestData();
      requestData.namaPekerja = "Agustinus A";
      requestData.szStatusId = StatusId.ST002;
      requestData.szReasonImage = 'data:image/jpeg;base64,' + img.image;
      requestData.statusInsiden = false;
      this.requestDatas.push(requestData);
    }
    if (index == 5) {
      var requestData = new RequestData();
      requestData.namaPekerja = "Mikel Ammar";
      requestData.szStatusId = StatusId.ST001;
      requestData.szReasonImage = 'data:image/jpeg;base64,' + img.image;
      requestData.statusInsiden = false;
      this.requestDatas.push(requestData);
    }
    if (index == 6) {
      var requestData = new RequestData();
      requestData.namaPekerja = "Bin Hadid";
      requestData.szStatusId = StatusId.ST001;
      requestData.szReasonImage = 'data:image/jpeg;base64,' + img.image;
      requestData.statusInsiden = false;
      this.requestDatas.push(requestData);
    }
    // else {
    //   var requestData = new RequestData();
    //   requestData.namaPekerja = "Burhanuddin";
    //   requestData.szStatusId = StatusId.ST001;
    //   requestData.szReasonImage = 'data:image/jpeg;base64,' + img.image;
    //   this.requestDatas.push(requestData);
    // }
    return index;
  }

  public GetRequestDatasForNotifications(szUserId: string) {
    this.requestDatas = [];
    var url = 'http://sihk.hutamakarya.com/apiabsen/GetRequestDatasForNotifications.php';

    let postdata = new FormData();
    postdata.append('szUserId', this.userData.szidmandor);

    var data: any = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      this.requestDataStatus = data.status;
      if (data.error == false) {
        this.requestDatas = data.result;
      }
      else {
        this.requestDatas = [];
      }
    });
  }

  public CloseRequestData(szUserId: string, dateRequest: string, szActivityId: string) {
    this.requestDatas = [];
    var url = 'http://sihk.hutamakarya.com/apiabsen/CloseRequestData.php';

    let postdata = new FormData();
    postdata.append('szUserId', szUserId);
    postdata.append('dateRequest', dateRequest);
    postdata.append('szActivityId', szActivityId);
    postdata.append('dtmLastUpdated', new Date().toLocaleString());

    var data: any = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      if (data.error == true) { console.log("BUG: 'Gagal'"); }
    });
  }

  public SaveRequestData(requestData: RequestData) {
    var url = 'http://sihk.hutamakarya.com/apiabsen/SaveRequestData.php';

    let postdata = new FormData();
    postdata.append('szUserId', requestData.szUserId);
    postdata.append('dateRequest', requestData.dateRequest);
    postdata.append('szActivityId', requestData.szactivityid);
    postdata.append('szDesc', requestData.szDesc);
    postdata.append('szLocation', requestData.szLocation);
    postdata.append('szStatusId', requestData.szStatusId);
    postdata.append('decTotal', requestData.decTotal);
    postdata.append('szReasonImage', requestData.szReasonImage);
    postdata.append('bActiveRequest', String(requestData.bActiveRequest));
    postdata.append('dtmCreated', requestData.dateRequest);
    postdata.append('dtmLastUpdated', requestData.dateRequest);

    var data: Observable<any> = this.httpClient.post(url, postdata);
    data.subscribe(data => {
      if (data.error == false) {
        this.PresentToast(requestData.szactivityid == ActivityId.AC002 ? "Berhasil mengajukan izin terlambat" :
          requestData.szactivityid == ActivityId.AC003 ? "Berhasil mengajukan izin datang diluar kantor" :
            requestData.szactivityid == ActivityId.AC004 ? "Berhasil mengajukan izin pulang diluar kantor" : "");
        this.router.navigate(['home']);
        this.dateRequest = "";
        this.timeRequest = "";
      }
      else {
        if (data.error == true) {
          this.PresentAlert(data.error_msg);
          throw new Error(data.error_msg);
        }
      }
    });
  }

  async PresentToast(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      color: "dark",
      mode: "ios"
    });
    toast.present();
  }

  PresentAlert(msg: string) {
    this.alertController.create({
      mode: 'ios',
      message: msg,
      buttons: ['OK']
    }).then(alert => {
      return alert.present();
    });
  }
}

export class UserData {
  public szidmandor: string;
  public password: string;
  public sznamamandor: string;
  public szperusahaan: string;
  public sznamaproyek: string;
  public szalamat: string;
  public szjumlah: string;

  constructor() { }
}

export class PekerjaData {
  public szidmandor: string;
  public sznamamandor: string;
  public sznamaproyek: string;
  public szidpekerja: string;
  public sznamapekerja: string;
  public szimage: string;

  constructor() { }
}

export class DateData {
  public date: Date;
  public szDay: string;
  public decDate: number;
  public szMonth: string;
  public decYear: number;
  public decHour: number;
  public szHour: string;
  public decMinute: number;
  public szMinute: string;
  public szAMPM: string;
  public decSec: number;
  decMonth: number;
  day2: number;

  constructor() { }
}

export class ReportData {
  public szUserId: string;
  public dateAbsen: string;
  public timeArrived: string;
  public timeValidArrived: string;
  public timeReturn: string = "00:00:00";
  public timeValidReturn: string;
  public decMonth: number;
}

export class SummaryReportData {
  public szMonthAttendance: string;
  public decTotalAttendance: number;
  public decTotalAbsen: number;
  public decTotalLate: number;
  public decTotalBackEarly: number;
  public decTotalOvertime: number;
}

export class RequestData {
  public namaPekerja: string;
  public szUserId: string;
  public szUserName: string;
  public dateRequest: string;
  public szactivityid: string;
  public szActivityName: string;
  public szDesc: string;
  public szLocation: string;
  public szStatusId: string;
  public szStatusName: string;
  public decTotal: string;
  public szReasonImage: string;
  public bActiveRequest: boolean;
  public szSuperiorUserId: string; // cek dipakek bener ga
  public szSuperiorUserName: string; // cek dipakek bener ga
  public timeArrived: string; // cek dipakek bener ga
  public timeBack: string; // cek dipakek bener ga
  public statusInsiden: boolean; // cek dipakek bener ga
}

export class ActivityId {
  public static readonly AC001: string = "AC001"; //On Time
  public static readonly AC002: string = "AC002"; //Terlambat
  public static readonly AC003: string = "AC003"; //Datang Diluar Kantor
  public static readonly AC004: string = "AC004"; //Pulang Diluar Kantor
  public static readonly AC005: string = "AC005"; //Pulang Cepat
  public static readonly AC006: string = "AC006"; //Lembur
  public static readonly AC007: string = "AC007"; //Absen
  public static readonly AC008: string = "AC008"; //Sakit
  public static readonly AC009: string = "AC009"; //Izin Khusus
  public static readonly AC010: string = "AC010"; //Izin Cuti
}

export class StatusId {
  public static readonly ST001: string = "ST001"; //Approved
  public static readonly ST002: string = "ST002"; //Not Approved 
  public static readonly ST003: string = "ST003"; //Need Approval 
}

