Phase 4 已完成，并且对应的 /report/Stage_4_Report.md 已生成并确认无误。

请继续严格按照 execution_plan.md 与“AI 执行严格模式模板”执行 Phase 5。
执行 Phase 5 前请先确认 Phase 5 的目标与输入。



Here are the documents:

- @mask_storage_migration_plan.md  
- @mask_storage_migration_task.md  
- @mask_channel_colors_design.md  

Please execute Phase 2 — Day 6: Update CommToolsData & Type Definitions

When finish task need to update @mask_storage_migration_task.md
Do NOT proceed to the next step after completion.  
Wait for my validation and confirmation before continuing.


我现在让你在 @NrrdTools.ts 新增几个管理layer和channel的函数，要实现跑通 @LayerChannelSelector.vue layer 和channel对画笔, pencil，eraser的控制。
1. 你可以参考 @plan/reference/manager/core/LayerManager.ts和VisibilityManager.ts 看它是怎么设计layer 和channel的管理的，如有必要重写在@segmentation中，然后通过NrrdTools来导出。
    - 当layer选择不显示时，该layer下的所有channel mask 数据不能显示
    - 当layer选择显示时，只显示该layer下的所有选择显示的channel 的mask 数据
        - 比如我有3个layer：layer1， layer2， layer3，我这三个layer都支持8个channel， 那么默认我要展示所有layer上所有channel的mask数据到画布上。
          - 现在用户选择了只显示layer1 的数据，那么画布上就要移除layer2， layer3的mask数据
          - 现在用户选择了只显示layer1 的 channel 1， channel 3， channel 4， channel 5， channel 6，channel 7的数据， 那么画布上就要移除layer2， layer3的mask数据和layer 1 channel 2和channel 8的数据。以此类推
    - 支持多layer同时显示
        - 你需要好好的分析一下我的canvas架构：
         ```
          canvases: {
            originCanvas: null,
            drawingCanvas: canvases[0],
            displayCanvas: canvases[1],
            drawingCanvasLayerMaster: canvases[2],
            drawingCanvasLayerOne: canvases[3],
            drawingCanvasLayerTwo: canvases[4],
            drawingCanvasLayerThree: canvases[5],
            drawingSphereCanvas: canvases[6],
            emptyCanvas: canvases[7],
        },
         ``` 
         - drawingCanvasLayerOne 对应layer1 的数据层
         - drawingCanvasLayerTwo 对应layer2 的数据层
         - drawingCanvasLayerThree 对应layer3 的数据层
    - 默认选中要操作的是layer1 的channel 1， 所以你要把fillColor和brushColor的颜色默认改为channel 1的颜色
2. pencil，画笔和eraser只能操作选中的layer下的选中的channel 的mask的数据
   - 逻辑很简单：当用户选择了channel时，那么把fillColor和brushColor改成该channel对应的颜色即可， 你需要更改的函数在@gui.ts updatePencilState 其中segmentation==true即为pencil状态，false为brush状态。
   - 当通过pencil，画笔和eraser操作时，只能操作当前选择的channel的数据， 其他channel的数据不能动，你得要改造下我的this.drawingPrameters.handleOnDrawingMouseMove，你可以参考：@plan/reference/s_d.vue 文件中，它是如何让画笔和橡皮擦只工作在一个channel上的。pencil，画笔和eraser的基本功能你不准给我改变。
     - 比如： 现在用户使用的是pencil，现在选择的是layer 1 的channel 2 需要进行操作，而且此时所有layers的数据都显示在画布上的。
        - 那么现在用户更新画布layer 1 的channel 2的数据，画布上只能更新layer 1 的channel 2的数据，其他图层以及他们channel的数据都不能变。其实这个很好解决，因为我们更新layer 1 mask的数据是在drawingCanvasLayerOne上更新的，显示的画布一直在刷新显示drawingCanvasLayerOne，drawingCanvasLayerTwo，drawingCanvasLayerThree上所有选择显示的channel数据，我们只要解决到只能操作当前选择的channel的数据， 其他channel的数据不能动这个问题。那么其他的都会自动刷新在展示的画布上。
3. 当切换channel时，要更新画笔的颜色 fillColor:,brushColor: , 要让他们匹配选择的channel的颜色。
规则：

- 你根据NrrdTools 的方法来改造LayerChannelSelector.vue 和 useLayerChannel.ts让他们能实现我对layer和channel的管理和控制
- 执行完成后，要更新mask_storage_migration_task.md
 


 现在有几个Bug:
1. 它并没有实现将layer的操作和显示完全独立，原因是，我在测试时，我先在layer 1 的channel 1上使用pencil画了数据：
    - 然后我切换到操作layer 2 上，在layer 2 的channel 1 上画了数据，然后layer 1 的channel 1的mask在画板上消失了，只剩下layer 2 的channel 1的数据。此时，我并没有更改layer 1 和 layer 2 的显示状态，它们应该都要显示才对。
    - 然后，我隐藏layer1 后 马上有显示layer1，现在layer1和layer2的数据都出现在了画板上，此时我依然操作的是layer 2， 并没有切换过layer的操作，然后我使用橡皮擦去擦数据，发现layer 2的可以擦掉，layer 1 的擦不掉，这是对的。
    - 现在我隐藏layer2， 然后在显示layer2， 新的问题来了，我发现layer2会自动复制layer 1 的channel 1的数据到layer 2 channel 1. 这是不合理的。它无论如何都不应该复制其他layer的数据。
    - 这个问题很奇怪，当layer上有数据时，它们隐藏和显示时，它们似乎会互相复制数据。
2. 并没有实现channel 的操作独立，首先，我在layer 1 的channel 1上使用pencil画了数据， 是绿色的mask，
    - 然后我切换到layer 1 的channel 2， 使用pencil画了数据， 是红色的mask，现在画板上显示了channel 1 和 channel 2的数据是对的。然后我切换到layer 1 的channel 3，使用pencil画了数据是蓝色的mask， 现在问题来了，channel 1 和 channel 2的数据都变成红色的了，这意味着channel 1 被改写到channel 2了。 然后我切换到layer 1 的channel 4，使用pencil画了数据是黄色的mask，现在问题更严重了， channel 1， channel 2和channel 3的数据都变成蓝色的了。问题以此类推，当在新的channel上画数据时，会把之前所有channel的数据都改写到上一个channel上。这个问题只有在使用pencil时会发生，而且似乎它的alpha有问题，画出来的数据颜色在不断地加深。
    - 现在我在此基础上测试橡皮擦：目前我在操作的是channel 4，channel 4上的数据是可以被擦除的。然后我切换到channel 2， 不能擦除任何数据，说明数据被改写到其他channel 了。 然后我切换到channel 3， 除了channel4 的mask不可以被擦除，其他数据都可以，验证了我的猜想，当在新的channel上画数据时，会把之前所有channel的数据都改写到上一个channel上。这是个大问题。
    - 然后在此基础上，当前我选择的是channel 4， 我测试了切换slice， 发现，切换后再切换回来，所有mask的数据都被改写到了channel 4上。这是严重的bug， 切换slice，不允许修改layer及其channel的数据。再次测试，在切换contrast image时也会发生相同的情形，当你在那个channel上操作的，所有的mask都会被改到那个channel上去。