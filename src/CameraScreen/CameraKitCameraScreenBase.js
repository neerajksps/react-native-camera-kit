import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  NativeModules,
  Platform,
  SafeAreaView,
  processColor,
} from 'react-native';
import _ from 'lodash';
import CameraKitCamera from './../CameraKitCamera';

const IsIOS = Platform.OS === 'ios';
const GalleryManager = IsIOS ? NativeModules.CKGalleryManager : NativeModules.NativeGalleryModule;

const FLASH_MODE_AUTO = 'auto';
const FLASH_MODE_ON = 'on';
const FLASH_MODE_OFF = 'off';
const TORCH_MODE_ON = 'on';
const TORCH_MODE_OFF = 'off';
const OVERLAY_DEFAULT_COLOR = '#ffffff77';
const OFFSET_FRAME = 30;
const FRAME_HEIGHT = 200;

export default class CameraScreenBase extends Component {

  static propTypes = {
    allowCaptureRetake: PropTypes.bool,
  };

  static defaultProps = {
    allowCaptureRetake: false,
  };

  constructor(props) {
    super(props);
    this.currentFlashArrayPosition = 0;
    this.flashArray = [{
      mode: FLASH_MODE_AUTO,
      image: _.get(this.props, 'flashImages.auto'),
    },
    {
      mode: FLASH_MODE_ON,
      image: _.get(this.props, 'flashImages.on'),
    },
    {
      mode: FLASH_MODE_OFF,
      image: _.get(this.props, 'flashImages.off'),
    },
    ];
    this.state = {
      captureImages: [],
      flashData: this.flashArray[this.currentFlashArrayPosition],
      torchData: false,
      ratios: [],
      cameraOptions: {},
      ratioArrayPosition: -1,
      imageCaptured: undefined,
      captured: false,
      scannerOptions: {},
    };
    this.onSetFlash = this.onSetFlash.bind(this);
    this.onSetTorch = this.onSetTorch.bind(this);
    this.onSwitchCameraPressed = this.onSwitchCameraPressed.bind(this);
  }

  componentDidMount() {
    const cameraOptions = this.getCameraOptions();
    const scannerOptions = this.getScannerOptions();
    let ratios = [];
    if (this.props.cameraRatioOverlay) {
      ratios = this.props.cameraRatioOverlay.ratios || [];
    }
    this.setState({
      cameraOptions,
      scannerOptions,
      ratios: (ratios || []),
      ratioArrayPosition: ((ratios.length > 0) ? 0 : -1),
    });
  }

  isCaptureRetakeMode() {
    return !!(this.props.allowCaptureRetake && !_.isUndefined(this.state.imageCaptured));
  }

  getCameraOptions() {
    const cameraOptions = this.props.cameraOptions || {
      flashMode: 'auto',
      focusMode: 'on',
      zoomMode: 'on',
    };
    if (this.props.cameraRatioOverlay) {
      const overlay = this.props.cameraRatioOverlay;
      cameraOptions.ratioOverlayColor = overlay.color || OVERLAY_DEFAULT_COLOR;

      if (overlay.ratios && overlay.ratios.length > 0) {
        cameraOptions.ratioOverlay = overlay.ratios[0];
      }
    }

    return cameraOptions;
  }

  getScannerOptions() {
    const scannerOptions = this.props.scannerOptions || {};
    scannerOptions.offsetFrame = this.props.offsetForScannerFrame || OFFSET_FRAME;
    scannerOptions.frameHeight = this.props.heightForScannerFrame || FRAME_HEIGHT;
    if (this.props.colorForScannerFrame) {
      scannerOptions.colorForFrame = processColor(this.props.colorForScannerFrame);
    } else {
      scannerOptions.colorForFrame = processColor('white');
    }
    return scannerOptions;
  }

  renderFlashButton() {
    return !this.isCaptureRetakeMode() &&
      <TouchableOpacity style={{ paddingLeft: 5,paddingRight:18,height:40 ,alignItems:"center",}} onPress={() => this.onSetFlash(FLASH_MODE_AUTO)}>
        <Image
          style={{ flex: 1,height:35,width:35,alignSelf:"center"}}
          source={this.state.flashData.image}
          resizeMode="contain"
        />
      </TouchableOpacity>;
  }

  renderSwitchCameraButton() {
    return (this.props.cameraFlipImage && !this.isCaptureRetakeMode()) &&
      <TouchableOpacity style={{ marginTop:10,paddingHorizontal: 15 ,height:40,alignItems:"center"}} onPress={this.onSwitchCameraPressed}>
        <Image
          style={{ flex: 1,height:40,width:40,}}
          source={this.props.cameraFlipImage}
          resizeMode="contain"
        />
      </TouchableOpacity>;
  }

  renderTopButtons() {
    return !this.props.hideControls && (
      <SafeAreaView style={styles.topButtons}>
        {this.renderFlashButton()}
        {this.renderSwitchCameraButton()}
      </SafeAreaView>
    );
  }

  renderCamera() {
    return (
      <View style={styles.cameraContainer}>
        {
          this.isCaptureRetakeMode() ?
            <Image
              style={{ flex: 1, justifyContent: 'flex-end' }}
              source={{ uri: this.state.imageCaptured.uri }}
            /> :
            <CameraKitCamera
              ref={(cam) => this.camera = cam}
              style={{ flex: 1, justifyContent: 'flex-end',backgroundColor:"white" }}
              cameraOptions={this.state.cameraOptions}
              saveToCameraRoll={!this.props.allowCaptureRetake}
              showFrame={this.props.showFrame}
              scanBarcode={this.props.scanBarcode}
              laserColor={this.props.laserColor}
              frameColor={this.props.frameColor}
              surfaceColor={this.props.surfaceColor}
              onReadCode = {this.props.onReadCode}
              scannerOptions = {this.state.scannerOptions}
            />
        }
      </View>
    );
  }

  numberOfImagesTaken() {
    const numberTook = this.state.captureImages.length;
    if (numberTook >= 2) {
      return numberTook;
    } else if (this.state.captured) {
      return '1';
    } else {
      return '';
    }
  }

  renderCaptureButton() {
    return (this.props.captureButtonImage && !this.isCaptureRetakeMode()) &&
      <View style={styles.captureButtonContainer}>
        <TouchableOpacity
          onPress={() => this.onCaptureImagePressed()}
        >
          <Image
          style={{height:70,width:70}}
            source={this.props.captureButtonImage}
            resizeMode="contain"
          />
          <View style={styles.textNumberContainer}>
           {false?<Text>
              {this.numberOfImagesTaken()}
            </Text>:<Text></Text>}
          </View>

        </TouchableOpacity>
      </View >;
  }

  renderRatioStrip() {
    if (this.state.ratios.length === 0 || this.props.hideControls) {
      return null;
    }
    return (
      <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 10, paddingLeft: 20 }}>
          <Text style={styles.ratioBestText}>Your images look best at a {this.state.ratios[0] || ''} ratio</Text>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', padding: 8 }}
            onPress={() => this.onRatioButtonPressed()}
          >
            <Text style={styles.ratioText}>{this.state.cameraOptions.ratioOverlay}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  sendBottomButtonPressedAction(type, captureRetakeMode, image) {
    if (this.props.onBottomButtonPressed) {
      this.props.onBottomButtonPressed({ type, captureImages: this.state.captureImages, captureRetakeMode, image });
    }
  }

  onButtonPressed(type) {
    const captureRetakeMode = this.isCaptureRetakeMode();
    if (captureRetakeMode) {
      if (type === 'left') {
        GalleryManager.deleteTempImage(this.state.imageCaptured.uri);
        this.setState({ imageCaptured: undefined });
      }
    } else {
      this.sendBottomButtonPressedAction(type, captureRetakeMode);
    }
  }

  renderBottomButton(type) {
    const showButton = true;
    if (showButton) {
      const buttonNameSuffix = this.isCaptureRetakeMode() ? 'CaptureRetakeButtonText' : 'ButtonText';
      const buttonText = _(this.props).get(`actions.${type}${buttonNameSuffix}`);
      return (
        <TouchableOpacity
          style={[styles.bottomButton, { justifyContent: type === 'left' ? 'flex-start' : 'flex-end' }]}
          onPress={() => this.onButtonPressed(type)}
        >
          <Text style={styles.textStyle}>{buttonText}</Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <View style={styles.bottomContainerGap} />
      );
    }
  }

  renderBottomButtons() {
    return !this.props.hideControls && (
      <SafeAreaView style={[styles.bottomButtons, { backgroundColor: '#ffffff00' }]}>
        {/* {this.renderBottomButton('left')} */}
        {this.renderCaptureButton()}
      </SafeAreaView>
    );
  }

  onSwitchCameraPressed() {
    this.camera.changeCamera();
  }

  async onSetFlash() {
    this.currentFlashArrayPosition = (this.currentFlashArrayPosition + 1) % 3;
    const newFlashData = this.flashArray[this.currentFlashArrayPosition];
    this.setState({ flashData: newFlashData });
    this.camera.setFlashMode(newFlashData.mode);
  }

  onSetTorch() {
    const newTorchData = !this.state.torchData;
    this.setState({ torchData: newTorchData });
    newTorchData ? this.camera.setTorchMode(TORCH_MODE_ON) : this.camera.setTorchMode(TORCH_MODE_OFF);
  }

  async onCaptureImagePressed() {
    const image = await this.camera.capture();

    if (this.props.allowCaptureRetake) {
      this.setState({ imageCaptured: image });
    } else {
      if (image) {
        this.setState({ captured: true, imageCaptured: image, captureImages: _.concat(this.state.captureImages, image) });
      }
      this.sendBottomButtonPressedAction('capture', false, image);
    }
  }

  onRatioButtonPressed() {
    const newRatiosArrayPosition = ((this.state.ratioArrayPosition + 1) % this.state.ratios.length);
    const newCameraOptions = _.update(this.state.cameraOptions, 'ratioOverlay', (val) => this.state.ratios[newRatiosArrayPosition]);
    this.setState({ ratioArrayPosition: newRatiosArrayPosition, cameraOptions: newCameraOptions });
  }

  render() {
    throw ('Implemented in CameraKitCameraScreen!');
  }
}

import styleObject from './CameraKitCameraScreenStyleObject';
const styles = StyleSheet.create(_.merge(styleObject, {
  textStyle: {
    color: 'white',
    fontSize: 20,
  },
  ratioBestText: {
    color: 'white',
    fontSize: 18,
  },
  ratioText: {
    color: '#ffc233',
    fontSize: 18,
  },
  topButtons: {
    flex: 1,
    flexDirection: 'column',
    alignItems:'flex-end',
    paddingTop: 8,
    marginTop: 15,
  },
  cameraContainer: {
    flex: Platform.OS=="android"?10:15,
    flexDirection: 'column',
  },
  captureButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textNumberContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  bottomContainerGap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
  },
}));
