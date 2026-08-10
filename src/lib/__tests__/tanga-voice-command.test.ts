import {repairVoiceCommand, ruleIntent, stripWakePhrase} from '../tanga-voice-command';

describe('tanga voice wake parsing', () => {
  it('extracts an inline wake command', () => {
    expect(stripWakePhrase('Hey Tanga show resource')).toEqual({
      matched: true,
      command: 'show resource',
    });
  });

  it('arms follow-up mode when only the wake phrase is heard', () => {
    expect(stripWakePhrase('Hey Tanga')).toEqual({
      matched: true,
      command: '',
    });
  });

  it('accepts common wake phrase variants', () => {
    expect(stripWakePhrase('okay tango show high grade area')).toEqual({
      matched: true,
      command: 'show high grade area',
    });
  });

  it('ignores non-wake speech before the app is armed', () => {
    expect(stripWakePhrase('show resource')).toEqual({
      matched: false,
      command: '',
    });
  });
});

describe('tanga deterministic command mapping', () => {
  it('maps resource typos to the resource model', () => {
    expect(ruleIntent('show resurce')).toMatchObject({
      mode: 'resource',
      source: 'rules',
    });
  });

  it('maps high TGXC to high TGC resource focus', () => {
    expect(ruleIntent('show high TGXC area')).toMatchObject({
      mode: 'resource',
      resourceFocus: 'HighTGC',
      source: 'rules',
    });
  });

  it('maps inside high TGC commands to high TGC with a below-surface camera', () => {
    expect(ruleIntent('take me inside high tgc zone')).toMatchObject({
      mode: 'resource',
      resourceFocus: 'HighTGC',
      cameraAction: 'bottomView',
      source: 'rules',
    });
    expect(ruleIntent('inside high tgxc')).toMatchObject({
      mode: 'resource',
      resourceFocus: 'HighTGC',
      cameraAction: 'bottomView',
      source: 'rules',
    });
  });

  it('maps top resource phrases to the graphite peer ranking, not the resource model', () => {
    expect(ruleIntent(repairVoiceCommand('top 10 resource').command)).toMatchObject({
      mode: 'ranking',
      source: 'rules',
    });
    expect(ruleIntent(repairVoiceCommand('top ten resources').command)).toMatchObject({
      mode: 'ranking',
      source: 'rules',
    });
  });

  it('maps zoom commands to camera actions', () => {
    expect(ruleIntent('zoom in')).toMatchObject({
      mode: null,
      cameraAction: 'zoomIn',
    });
    expect(ruleIntent('zoom out')).toMatchObject({
      mode: null,
      cameraAction: 'zoomOut',
    });
  });

  it('maps project area commands to the Tanga project scene, not camera zoom', () => {
    expect(ruleIntent('project area')).toMatchObject({
      mode: 'project',
      cameraAction: undefined,
    });
    expect(ruleIntent('zoom in project area')).toMatchObject({
      mode: 'project',
      cameraAction: undefined,
    });
  });

  it('maps bottom view commands to the Three.js bottom camera action', () => {
    expect(ruleIntent('show from bottom')).toMatchObject({
      mode: null,
      cameraAction: 'bottomView',
    });
    expect(ruleIntent('move the camera down')).toMatchObject({
      mode: null,
      cameraAction: 'bottomView',
    });
    expect(ruleIntent('show resource model from below')).toMatchObject({
      mode: 'resource',
      cameraAction: 'bottomView',
    });
    expect(ruleIntent('show drillholes from below')).toMatchObject({
      mode: 'drillholes',
      cameraAction: 'bottomView',
    });
    expect(ruleIntent('show metallurgy from below')).toMatchObject({
      mode: 'metallurgy',
      cameraAction: 'bottomView',
    });
  });

  it('maps camera top commands to the Three.js top camera action', () => {
    expect(ruleIntent('camera at top')).toMatchObject({
      mode: null,
      cameraAction: 'tiltUp',
    });
    expect(ruleIntent('move the camera up')).toMatchObject({
      mode: null,
      cameraAction: 'tiltUp',
    });
    expect(ruleIntent('show resource model camera at top')).toMatchObject({
      mode: 'resource',
      cameraAction: 'tiltUp',
    });
    expect(ruleIntent('show metallurgy from above')).toMatchObject({
      mode: 'metallurgy',
      cameraAction: 'tiltUp',
    });
  });

  it('maps explicit rotations with degree metadata', () => {
    expect(ruleIntent('rotate 180 degree')).toMatchObject({
      mode: null,
      cameraAction: 'rotateDegrees',
      degrees: 180,
    });
    expect(ruleIntent('rotate 360 degree')).toMatchObject({
      mode: null,
      cameraAction: 'orbit360',
      degrees: 360,
    });
  });

  it('maps presentation navigation commands', () => {
    expect(ruleIntent('next slide')).toMatchObject({
      mode: null,
      navigation: 'next',
    });
    expect(ruleIntent('previous slide')).toMatchObject({
      mode: null,
      navigation: 'previous',
    });
    expect(ruleIntent('slide no 2')).toMatchObject({
      mode: 'tanzania',
      navigation: 'slide',
      slideNumber: 2,
    });
    expect(ruleIntent('go to slide 7')).toMatchObject({
      mode: 'resource',
      resourceFocus: 'All',
      navigation: 'slide',
      slideNumber: 7,
    });
    expect(ruleIntent('slide no 9')).toMatchObject({
      mode: 'comparison',
      navigation: 'slide',
      slideNumber: 9,
    });
  });

  it('maps peer comparison commands to the final comparison slide', () => {
    expect(ruleIntent('show peer comparison')).toMatchObject({
      mode: 'comparison',
      source: 'rules',
    });
    expect(ruleIntent('compare tanga with peers')).toMatchObject({
      mode: 'comparison',
      source: 'rules',
    });
    expect(ruleIntent(repairVoiceCommand('metallurgy comparison').command)).toMatchObject({
      mode: 'comparison',
      source: 'rules',
    });
  });

  it('distinguishes horizontal and vertical 360 rotations', () => {
    expect(ruleIntent(repairVoiceCommand('rotate horizontally 360').command)).toMatchObject({
      mode: null,
      cameraAction: 'orbit360',
      degrees: 360,
    });
    expect(ruleIntent(repairVoiceCommand('rotate vertically 360').command)).toMatchObject({
      mode: null,
      cameraAction: 'orbitVertical360',
      degrees: 360,
    });
  });
});

describe('tanga contextual command repair', () => {
  it('repairs common resource mishears before intent mapping', () => {
    expect(repairVoiceCommand('shoe me the resort').command).toBe('show resource model');
    expect(ruleIntent(repairVoiceCommand('show source').command)).toMatchObject({
      mode: 'resource',
    });
  });

  it('repairs noisy TGC and grade phrases', () => {
    expect(repairVoiceCommand('show high tgx area').command).toBe('show high grade area');
    expect(repairVoiceCommand('show high quality area').command).toBe('show high grade area');
    expect(repairVoiceCommand('take me inside high tgxc zone').command).toBe('take me inside high TGC zone');
    expect(ruleIntent(repairVoiceCommand('show high tgx area').command)).toMatchObject({
      mode: 'resource',
      resourceFocus: 'HighTGC',
    });
  });

  it('repairs ranking phrases before resource aliases can hijack them', () => {
    expect(repairVoiceCommand('top 10 resource').command).toBe('show top 10 graphite projects');
    expect(repairVoiceCommand('top ten resources').command).toBe('show top 10 graphite projects');
  });

  it('repairs drillhole and power route mishears', () => {
    expect(repairVoiceCommand('show drill hose').command).toBe('show drillholes');
    expect(repairVoiceCommand('show road to power plane').command).toBe('show route to power station');
  });
});
